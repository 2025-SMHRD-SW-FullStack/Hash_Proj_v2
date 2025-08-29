package com.meonjeo.meonjeo.cart;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.cart.dto.CartItemView;
import com.meonjeo.meonjeo.cart.dto.CartViewResponse;
import com.meonjeo.meonjeo.cart.dto.AddCartItemRequest;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.product.ProductVariant;
import com.meonjeo.meonjeo.product.ProductVariantRepository;
import com.meonjeo.meonjeo.security.AuthSupport;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartRepo;
    private final ProductRepository productRepo;
    private final ProductVariantRepository variantRepo;
    private final AuthSupport auth;
    private final ObjectMapper objectMapper;

    private static final int FLAT_SHIPPING_FEE = 3000;

    private Long uid(){ return auth.currentUserId(); }

    /** 장바구니 담기(동일 SKU면 수량 합치기) */
    @Transactional
    public void add(AddCartItemRequest req){
        Long userId = uid();
        if (req.qty() < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "QTY_MIN_1");

        Product p = productRepo.findById(req.productId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));

        // 옵션 라벨/값으로 Variant 식별
        String[] labels = { p.getOption1Name(), p.getOption2Name(), p.getOption3Name(), p.getOption4Name(), p.getOption5Name() };
        String[] vals = mapOptionsToValues(labels, normalize(req.options()));

        ProductVariant v = variantRepo.matchOne(p.getId(), vals[0], vals[1], vals[2], vals[3], vals[4])
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "VARIANT_NOT_FOUND"));

        // 병합(있으면 증가)
        Optional<CartItem> existing = cartRepo.findByUserIdAndVariantId(userId, v.getId());
        if (existing.isPresent()) {
            CartItem it = existing.get();
            it.setQty(it.getQty() + req.qty());
            it.setSelectedOptionsJson(toOptionsJson(labels, vals));
            cartRepo.save(it);
            return;
        }

        CartItem item = CartItem.builder()
                .userId(userId)
                .productId(p.getId())
                .sellerId(p.getSellerId())
                .variantId(v.getId())
                .qty(req.qty())
                .selectedOptionsJson(toOptionsJson(labels, vals))
                .build();
        cartRepo.save(item);
    }

    @Transactional
    public void updateQty(Long cartItemId, int qty){
        if (qty < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "QTY_MIN_1");
        CartItem it = cartRepo.findByIdAndUserId(cartItemId, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CART_ITEM_NOT_FOUND"));
        it.setQty(qty);
        cartRepo.save(it);
    }

    @Transactional
    public void remove(Long cartItemId){
        CartItem it = cartRepo.findByIdAndUserId(cartItemId, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CART_ITEM_NOT_FOUND"));
        cartRepo.delete(it);
    }

    @Transactional
    public void clear(){
        cartRepo.deleteByUserId(uid());
    }

    /** 장바구니 조회(현재 가격/재고로 계산) */
    @Transactional
    public CartViewResponse getView(){
        Long userId = uid();
        List<CartItem> items = cartRepo.findByUserIdOrderByIdDesc(userId);

        // Product/Variant 일괄 조회
        Map<Long, Product> productMap = productRepo.findAllById(
                items.stream().map(CartItem::getProductId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(Product::getId, x -> x));

        Map<Long, ProductVariant> variantMap = variantRepo.findAllById(
                items.stream().map(CartItem::getVariantId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(ProductVariant::getId, x -> x));

        int total = 0;
        List<CartItemView> views = new ArrayList<>();

        for (CartItem it : items){
            Product p = productMap.get(it.getProductId());
            ProductVariant v = variantMap.get(it.getVariantId());
            if (p == null || v == null) {
                // 상품/옵션이 삭제되었을 수 있음 → 표시만 하고 inStock=false
                CartItemView view = new CartItemView(it.getId(), it.getProductId(), "(삭제됨)", it.getVariantId(),
                        it.getSelectedOptionsJson(), 0, it.getQty(), 0, false);
                views.add(view);
                continue;
            }

            int base = (p.getSalePrice() > 0 ? p.getSalePrice() : p.getBasePrice());
            int unit = base + v.getAddPrice();
            boolean inStock = v.getStock() >= it.getQty();
            int subtotal = unit * it.getQty();
            total += subtotal;

            CartItemView view = new CartItemView(
                    it.getId(), p.getId(), p.getName(), v.getId(),
                    it.getSelectedOptionsJson(), unit, it.getQty(), subtotal, inStock
            );
            views.add(view);
        }

        int shipping = items.isEmpty() ? 0 : FLAT_SHIPPING_FEE;
        return new CartViewResponse(views, total, shipping, total + shipping);
    }

    /** 체크아웃에 넣을 CheckoutItem용 (라벨→값 맵) 생성 */
    @Transactional
    public List<com.meonjeo.meonjeo.order.dto.CheckoutItem> buildCheckoutItems(){
        Long userId = uid();
        List<CartItem> items = cartRepo.findByUserIdOrderByIdDesc(userId);
        if (items.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "CART_EMPTY");

        Map<Long, Product> productMap = productRepo.findAllById(
                items.stream().map(CartItem::getProductId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(Product::getId, x -> x));

        Map<Long, ProductVariant> variantMap = variantRepo.findAllById(
                items.stream().map(CartItem::getVariantId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(ProductVariant::getId, x -> x));

        List<com.meonjeo.meonjeo.order.dto.CheckoutItem> list = new ArrayList<>();
        for (CartItem it : items){
            Product p = productMap.get(it.getProductId());
            ProductVariant v = variantMap.get(it.getVariantId());
            if (p == null || v == null)
                throw new ResponseStatusException(HttpStatus.CONFLICT, "CART_CONTAINS_INVALID_ITEM");

            // 라벨 → 값 맵 구성 (OrderService가 라벨 키를 선호)
            Map<String,String> options = new LinkedHashMap<>();
            if (p.getOption1Name() != null) options.put(p.getOption1Name(), v.getOption1Value());
            if (p.getOption2Name() != null) options.put(p.getOption2Name(), v.getOption2Value());
            if (p.getOption3Name() != null) options.put(p.getOption3Name(), v.getOption3Value());
            if (p.getOption4Name() != null) options.put(p.getOption4Name(), v.getOption4Value());
            if (p.getOption5Name() != null) options.put(p.getOption5Name(), v.getOption5Value());

            list.add(new com.meonjeo.meonjeo.order.dto.CheckoutItem(p.getId(), it.getQty(), options));
        }
        return list;
    }

    // ===== helpers =====
    private static Map<String,String> normalize(Map<String,String> in){
        if (in == null || in.isEmpty()) return Collections.emptyMap();
        Map<String,String> out = new LinkedHashMap<>();
        in.forEach((k,v) -> {
            if (k != null && v != null) {
                String kk = k.trim(); String vv = v.trim();
                if (!kk.isEmpty() && !vv.isEmpty()) out.put(kk, vv);
            }
        });
        return out;
    }

    private String[] mapOptionsToValues(String[] labels, Map<String,String> map){
        // labels 길이 5 고정 (null 허용)
        String[] vals = new String[5];
        boolean hasAny = Arrays.stream(labels).anyMatch(Objects::nonNull);
        if (!hasAny) return vals; // 옵션 없는 상품

        if (map.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OPTION_REQUIRED: " + Arrays.toString(effectiveLabels(labels)));

        for (int i=0;i<5;i++){
            String label = labels[i];
            if (label == null) { vals[i] = null; continue; }
            String v = coalesce(map.get(label), map.get("option"+(i+1)+"Value"), map.get("option"+(i+1)));
            if (v == null || v.isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OPTION_REQUIRED: " + label);
            vals[i] = v.trim();
        }
        return vals;
    }

    private static String[] effectiveLabels(String[] labels){
        return Arrays.stream(labels).filter(Objects::nonNull).toArray(String[]::new);
    }
    private static String coalesce(String... ss){ for (String s: ss) if (s!=null && !s.isBlank()) return s; return null; }

    private String toOptionsJson(String[] labels, String[] vals){
        try {
            Map<String,String> m = new LinkedHashMap<>();
            for (int i=0;i<labels.length;i++){
                if (labels[i] != null) m.put(labels[i], vals[i]);
            }
            return objectMapper.writeValueAsString(m);
        } catch (Exception e){
            return "{}";
        }
    }
}
