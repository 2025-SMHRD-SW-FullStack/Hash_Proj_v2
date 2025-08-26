package com.meonjeo.meonjeo.product;

import com.meonjeo.meonjeo.product.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import static java.util.stream.Collectors.toList;

/**
 * [비즈 규칙]
 * - 옵션이 없으면: 단일 SKU(모든 optionXValue=null, addPrice=0, stock=stockTotal) 자동 생성
 * - 옵션이 있으면: variants 합계로 product.stockTotal 갱신
 * - saleStartAt ≤ saleEndAt 검사(둘 다 있을 때)
 * - 옵션 라벨은 1~N까지 연속되어야 함(예: option2Name이 있는데 option1Name이 비어있으면 에러)
 */
@Service @RequiredArgsConstructor
public class ProductService {
    private final ProductRepository productRepo;
    private final ProductVariantRepository variantRepo;

    @Transactional
    public Long create(ProductCreateRequest req) {

        if (req.saleStartAt() != null && req.saleEndAt() != null
                && req.saleStartAt().isAfter(req.saleEndAt())) {
            throw new IllegalArgumentException("판매 시작 시각은 종료 시각보다 늦을 수 없습니다.");
        }

        // 옵션 라벨 연속성 체크
        List<String> names = Arrays.asList(   // ✅ null 허용
                nv(req.option1Name()),
                nv(req.option2Name()),
                nv(req.option3Name()),
                nv(req.option4Name()),
                nv(req.option5Name())
        );
        int maxIdx = lastNonBlankIndex(names); // 0-based
        for (int i = 0; i <= maxIdx; i++) {
            if (names.get(i) == null) {
                throw new IllegalArgumentException("옵션 라벨은 1단계부터 연속으로 입력해야 합니다. (중간 공백 불가)");
            }
        }

        Product p = productRepo.save(Product.builder()
                .name(req.name().trim())
                .brand(req.brand().trim())
                .basePrice(req.basePrice())
                .salePrice(req.salePrice())
                .category(req.category().trim())
                .thumbnailUrl(req.thumbnailUrl().trim())
                .detailHtml(req.detailHtml())
                .stockTotal(req.stockTotal())  // variants 있으면 아래에서 갱신
                .feedbackPoint(req.feedbackPoint())
                .saleStartAt(req.saleStartAt())
                .saleEndAt(req.saleEndAt())
                .option1Name(nv(req.option1Name()))
                .option2Name(nv(req.option2Name()))
                .option3Name(nv(req.option3Name()))
                .option4Name(nv(req.option4Name()))
                .option5Name(nv(req.option5Name()))
                .build());

        // ===== variants 생성 =====
        List<ProductVariant> toSave = new ArrayList<>();
        List<ProductVariantCreateRequest> vReq = req.variants();

        if (vReq == null || vReq.isEmpty()) {
            // 옵션 없음: 단일 SKU 자동 생성
            toSave.add(ProductVariant.builder()
                    .product(p)
                    .addPrice(0)
                    .stock(req.stockTotal())
                    .build());
        } else {
            // 옵션 있음: 조합 저장 & 유효성/중복 검사
            Set<String> uniqueKey = new HashSet<>();
            int totalStock = 0;

            for (ProductVariantCreateRequest v : vReq) {
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
                        ns(pv.getOption5Value())
                );
                if (!uniqueKey.add(key)) {
                    throw new IllegalArgumentException("중복된 옵션 조합이 있습니다: " + key);
                }

                totalStock += pv.getStock();
                toSave.add(pv);
            }
            p.setStockTotal(totalStock);
        }

        variantRepo.saveAll(toSave);
        return p.getId();
    }

    @Transactional(readOnly = true)
    public ProductWithVariantsResponse get(Long id) {
        Product p = productRepo.findById(id).orElseThrow();
        var variants = variantRepo.findByProductId(id).stream()
                .map(v -> new ProductVariantResponse(
                        v.getId(),
                        v.getOption1Value(), v.getOption2Value(), v.getOption3Value(), v.getOption4Value(), v.getOption5Value(),
                        v.getAddPrice(), v.getStock(), v.getSkuCode()
                )).collect(toList());

        var pr = new ProductResponse(
                p.getId(), p.getName(), p.getBrand(), p.getBasePrice(), p.getSalePrice(),
                p.getCategory(), p.getThumbnailUrl(), p.getDetailHtml(),
                p.getStockTotal(), p.getFeedbackPoint(), p.getSaleStartAt(), p.getSaleEndAt(),
                p.getOption1Name(), p.getOption2Name(), p.getOption3Name(), p.getOption4Name(), p.getOption5Name()
        );
        return new ProductWithVariantsResponse(pr, variants);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> list() {
        return productRepo.findAll().stream().map(p ->
                new ProductResponse(
                        p.getId(), p.getName(), p.getBrand(), p.getBasePrice(), p.getSalePrice(),
                        p.getCategory(), p.getThumbnailUrl(), p.getDetailHtml(),
                        p.getStockTotal(), p.getFeedbackPoint(), p.getSaleStartAt(), p.getSaleEndAt(),
                        p.getOption1Name(), p.getOption2Name(), p.getOption3Name(), p.getOption4Name(), p.getOption5Name()
                )
        ).collect(toList());
    }

    // ===== helpers =====
    private static String nv(String s){ return (s == null || s.isBlank()) ? null : s.trim(); }
    private static String ns(String s){ return s == null ? "" : s; }
    private static String vv(String value, String label){
        // 라벨이 없으면 값 무시(null). 라벨이 있는데 값이 비면 에러.
        if (label == null) return null;
        if (value == null || value.isBlank()) throw new IllegalArgumentException("옵션 '"+label+"' 값이 비어 있습니다.");
        return value.trim();
    }
    private static int lastNonBlankIndex(List<String> list){
        int idx = -1;
        for (int i = 0; i < list.size(); i++){
            if (list.get(i) != null) idx = i;
        }
        return idx;
    }
}
