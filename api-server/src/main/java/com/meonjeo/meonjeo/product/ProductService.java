package com.meonjeo.meonjeo.product;

import com.meonjeo.meonjeo.product.dto.*;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.seller.SellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import static java.util.stream.Collectors.toList;

@Service @RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepo;
    private final ProductVariantRepository variantRepo;
    private final AuthSupport auth;
    private final SellerService sellerService;

    private Long currentUserId(){ return auth.currentUserId(); }
    private boolean hasRole(String role) {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null) return false;
        String want = "ROLE_" + role;
        return a.getAuthorities().stream().anyMatch(gr -> want.equals(gr.getAuthority()));
    }

    // ====== 공개 조회 ======
    @Transactional(readOnly = true)
    public List<ProductResponse> listPublic() {
        var now = java.time.LocalDateTime.now();
        return productRepo.findPublic(now).stream()
                .map(this::toProductResponse)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductWithVariantsResponse getPublic(Long id) {
        Product p = productRepo.findById(id).orElseThrow();
        return new ProductWithVariantsResponse(toProductResponse(p), toVariantResponses(id));
    }

    // ====== 셀러/관리자 전용 조회 ======
    @Transactional(readOnly = true)
    public List<ProductResponse> listForCurrentPrincipal() {
        List<Product> src = hasRole("ADMIN")
                ? productRepo.findAll()
                : productRepo.findBySellerIdOrderByIdDesc(currentUserId());
        return src.stream().map(this::toProductResponse).collect(toList());
    }
    @Transactional(readOnly = true)
    public ProductWithVariantsResponse getForCurrentPrincipal(Long id) {
        Product p = productRepo.findById(id).orElseThrow();
        if (!hasRole("ADMIN")) {
            Long uid = currentUserId();
            if (uid == null || !Objects.equals(p.getSellerId(), uid)) throw new IllegalStateException("FORBIDDEN_NOT_OWNER");
        }
        return new ProductWithVariantsResponse(toProductResponse(p), toVariantResponses(id));
    }

    // ====== 생성 ======
    @Transactional
    public Long create(ProductCreateRequest req) {
        Long sellerId = currentUserId();
        if (sellerId == null) throw new IllegalStateException("UNAUTHORIZED");
        if (!sellerService.isApprovedSeller(sellerId)) throw new IllegalStateException("SELLER_NOT_APPROVED");
        validateCommon(req);

        Product p = productRepo.save(Product.builder()
                .sellerId(sellerId)
                .name(req.name().trim())
                .brand(req.brand().trim())
                .basePrice(req.basePrice())
                .salePrice(req.salePrice())
                .category(req.category().trim())
                .thumbnailUrl(req.thumbnailUrl().trim())
                .detailHtml(req.detailHtml())
                .stockTotal(req.stockTotal())
                .feedbackPoint(req.feedbackPoint())
                .saleStartAt(req.saleStartAt())
                .saleEndAt(req.saleEndAt())
                .option1Name(nv(req.option1Name()))
                .option2Name(nv(req.option2Name()))
                .option3Name(nv(req.option3Name()))
                .option4Name(nv(req.option4Name()))
                .option5Name(nv(req.option5Name()))
                .build());

        replaceVariantsAccordingToRequest(p, req.variants(), req.stockTotal());
        return p.getId();
    }

    // ====== 수정 ======
    @Transactional
    public void update(Long id, ProductCreateRequest req) {
        Product p = productRepo.findById(id).orElseThrow();

        // 권한: 관리자는 전체, 셀러는 본인 소유만
        if (!hasRole("ADMIN")) {
            Long uid = currentUserId();
            if (uid == null || !Objects.equals(p.getSellerId(), uid)) throw new IllegalStateException("FORBIDDEN_NOT_OWNER");
            if (!sellerService.isApprovedSeller(uid)) throw new IllegalStateException("SELLER_NOT_APPROVED");
        }

        validateCommon(req);

        // 필드 업데이트 (sellerId 불변)
        p.setName(req.name().trim());
        p.setBrand(req.brand().trim());
        p.setBasePrice(req.basePrice());
        p.setSalePrice(req.salePrice());
        p.setCategory(req.category().trim());
        p.setThumbnailUrl(req.thumbnailUrl().trim());
        p.setDetailHtml(req.detailHtml());
        p.setFeedbackPoint(req.feedbackPoint());
        p.setSaleStartAt(req.saleStartAt());
        p.setSaleEndAt(req.saleEndAt());
        p.setOption1Name(nv(req.option1Name()));
        p.setOption2Name(nv(req.option2Name()));
        p.setOption3Name(nv(req.option3Name()));
        p.setOption4Name(nv(req.option4Name()));
        p.setOption5Name(nv(req.option5Name()));
        // stockTotal은 variants 전면 교체 시 아래에서 다시 계산/세팅

        productRepo.save(p);

        // 옵션 배열 전달 방식:
        //  - req.variants() == null  → 옵션/재고 변경 없음
        //  - req.variants().isEmpty()→ 단일 SKU로 리셋(재고는 req.stockTotal 사용)
        //  - 그 외(리스트 존재)      → 전달된 조합으로 전면 교체
        if (req.variants() != null) {
            replaceVariantsAccordingToRequest(p, req.variants(), req.stockTotal());
        }
    }

    // ====== 삭제 ======
    @Transactional
    public void delete(Long id) {
        Product p = productRepo.findById(id).orElseThrow();

        if (!hasRole("ADMIN")) {
            Long uid = currentUserId();
            if (uid == null || !Objects.equals(p.getSellerId(), uid)) throw new IllegalStateException("FORBIDDEN_NOT_OWNER");
        }

        // 주문에는 스냅샷이 남으므로 상품 삭제 가능. (필요 시 soft delete로 바꿀 수 있음)
        variantRepo.deleteByProductId(p.getId());
        productRepo.delete(p);
    }

    // ====== 내부 유틸 ======
    private void validateCommon(ProductCreateRequest req) {
        if (req.saleStartAt() != null && req.saleEndAt() != null && req.saleStartAt().isAfter(req.saleEndAt())) {
            throw new IllegalArgumentException("판매 시작 시각은 종료 시각보다 늦을 수 없습니다.");
        }
        // ⛔ 할인가 50% 가드
        if (req.salePrice() > 0) {
            int min = (int)Math.ceil(req.basePrice() * 0.5);
            if (req.salePrice() < min || req.salePrice() > req.basePrice()) {
                throw new IllegalArgumentException("할인가는 기본가의 50% 이상, 100% 이하만 허용됩니다.");
            }
        }

        // 옵션 라벨 연속성 체크
        List<String> names = Arrays.asList(
                nv(req.option1Name()), nv(req.option2Name()), nv(req.option3Name()),
                nv(req.option4Name()), nv(req.option5Name())
        );
        int maxIdx = lastNonBlankIndex(names);
        for (int i = 0; i <= maxIdx; i++) {
            if (names.get(i) == null) throw new IllegalArgumentException("옵션 라벨은 1단계부터 연속으로 입력해야 합니다. (중간 공백 불가)");
        }
    }

    /** 옵션가(추가금) ±50% 서버 검증 */
    private static void validateOptionDeltaWithin50pct(int basePrice, int salePrice, int addPrice) {
        int base = (salePrice > 0 ? salePrice : basePrice);
        int limit = (int)Math.ceil(base * 0.5);
        if (Math.abs(addPrice) > limit) {
            throw new IllegalArgumentException("OPTION_ADD_PRICE_EXCEEDS_50PCT");
        }
    }

    private void replaceVariantsAccordingToRequest(Product p, List<ProductVariantCreateRequest> vReq, int stockTotalIfSingle) {
        variantRepo.deleteByProductId(p.getId());

        if (vReq == null || vReq.isEmpty()) {
            // 단일 SKU
            variantRepo.save(ProductVariant.builder()
                    .product(p)
                    .addPrice(0)
                    .stock(stockTotalIfSingle)
                    .build());
            p.setStockTotal(stockTotalIfSingle);
            productRepo.save(p);
            return;
        }

        Set<String> uniqueKey = new HashSet<>();
        int totalStock = 0;
        List<ProductVariant> toSave = new ArrayList<>();

        for (ProductVariantCreateRequest v : vReq) {
            // ✅ 옵션가 ±50% 백엔드 검증
            validateOptionDeltaWithin50pct(p.getBasePrice(), p.getSalePrice(), v.addPrice());

            ProductVariant pv = ProductVariant.builder()
                    .product(p)
                    .option1Value(vv(v.option1Value(), p.getOption1Name()))
                    .option2Value(vv(v.option2Value(), p.getOption2Name()))
                    .option3Value(vv(v.option3Value(), p.getOption3Name()))
                    .option4Value(vv(v.option4Value(), p.getOption4Name()))
                    .option5Value(vv(v.option5Value(), p.getOption5Name()))
                    .addPrice(v.addPrice())
                    .stock(v.stock())
                    .build();

            String key = String.join("|",
                    ns(pv.getOption1Value()), ns(pv.getOption2Value()),
                    ns(pv.getOption3Value()), ns(pv.getOption4Value()),
                    ns(pv.getOption5Value()));
            if (!uniqueKey.add(key)) throw new IllegalArgumentException("중복된 옵션 조합이 있습니다: " + key);

            totalStock += pv.getStock();
            toSave.add(pv);
        }
        variantRepo.saveAll(toSave);
        p.setStockTotal(totalStock);
        productRepo.save(p);
    }

    private ProductResponse toProductResponse(Product p) {
        return new ProductResponse(
                p.getId(), p.getName(), p.getBrand(), p.getBasePrice(), p.getSalePrice(),
                p.getCategory(), p.getThumbnailUrl(), p.getDetailHtml(),
                p.getStockTotal(), p.getFeedbackPoint(), p.getSaleStartAt(), p.getSaleEndAt(),
                p.getOption1Name(), p.getOption2Name(), p.getOption3Name(), p.getOption4Name(), p.getOption5Name()
        );
    }
    private List<ProductVariantResponse> toVariantResponses(Long productId) {
        return variantRepo.findByProductId(productId).stream()
                .map(v -> new ProductVariantResponse(
                        v.getId(),
                        v.getOption1Value(), v.getOption2Value(), v.getOption3Value(), v.getOption4Value(), v.getOption5Value(),
                        v.getAddPrice(), v.getStock(), v.getSkuCode()
                )).collect(toList());
    }

    private static String nv(String s){ return (s == null || s.isBlank()) ? null : s.trim(); }
    private static String ns(String s){ return s == null ? "" : s; }
    private static String vv(String value, String label){
        if (label == null) return null;
        if (value == null || value.isBlank()) throw new IllegalArgumentException("옵션 '"+label+"' 값이 비어 있습니다.");
        return value.trim();
    }
    private static int lastNonBlankIndex(List<String> list){
        int idx = -1;
        for (int i = 0; i < list.size(); i++) if (list.get(i) != null) idx = i;
        return idx;
    }
}
