package com.meonjeo.meonjeo.order;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.address.UserAddress;
import com.meonjeo.meonjeo.address.UserAddressRepository;
import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.order.dto.CheckoutItem;
import com.meonjeo.meonjeo.order.dto.CheckoutRequest;
import com.meonjeo.meonjeo.order.dto.CheckoutResponse;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.product.ProductVariant;
import com.meonjeo.meonjeo.product.ProductVariantRepository;
import com.meonjeo.meonjeo.security.AuthSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepo;
    private final ProductRepository productRepo;
    private final ProductVariantRepository variantRepo;
    private final UserAddressRepository addressRepo;
    private final PointLedgerPort pointLedger;
    private final ObjectMapper objectMapper;
    private final AuthSupport auth;

    private static final int FLAT_SHIPPING_FEE = 3000;

    private Long currentUserId() { return auth.currentUserId(); }

    @Transactional
    public void manualConfirm(Long orderId) {
        Long uid = currentUserId();
        Order o = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        if (!Objects.equals(o.getUserId(), uid))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");

        if (o.getDeliveredAt() == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "NOT_DELIVERED");

        LocalDateTime deadline = o.getDeliveredAt().plusDays(7);
        if (LocalDateTime.now().isAfter(deadline))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CONFIRM_WINDOW_CLOSED");

        if (o.getConfirmedAt() != null) return; // 멱등

        o.setStatus(OrderStatus.CONFIRMED);
        o.setConfirmedAt(LocalDateTime.now());
        o.setConfirmationType(Order.ConfirmationType.MANUAL);
        orderRepo.save(o);
    }

    @Transactional
    public CheckoutResponse checkout(CheckoutRequest req) {
        Long userId = currentUserId();

        // 0) 주소 소유 및 스냅샷
        UserAddress addr = addressRepo.findByIdAndUserId(req.addressId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "ADDRESS_NOT_FOUND_OR_FORBIDDEN"));

        // 배송 요청사항 서버측 방어
        String safeMemo = sanitizeMemo(req.requestMemo());

        boolean allItemsAreIntangible = true; // 모든 상품이 무형자산인지 확인하는 플래그
        for (CheckoutItem ci : req.items()) {
            Product p = productRepo.findById(ci.productId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND: " + ci.productId()));

            // '무형자산'이 아닌 상품이 하나라도 있으면 플래그를 false로 변경하고 반복 중단
            if (!"무형자산".equals(p.getCategory())) {
                allItemsAreIntangible = false;
                break;
            }
        }

        // 모든 상품이 무형자산일 경우 배송비를 0원으로, 그렇지 않으면 3000원으로 설정
        int shippingFee = allItemsAreIntangible ? 0 : FLAT_SHIPPING_FEE;

        Order order = Order.builder()
                .userId(userId)
                .status(OrderStatus.PENDING)
                .receiver(addr.getReceiver())
                .phone(addr.getPhone())
                .addr1(addr.getAddr1())
                .addr2(addr.getAddr2())
                .zipcode(addr.getZipcode())
                .requestMemo(safeMemo)
                .createdAt(LocalDateTime.now())
                .shippingFee(shippingFee) // ⬅️ 계산된 배송비 적용
                .build();
        if (order.getItems() == null) order.setItems(new ArrayList<>());

        int total = 0; // 상품 총액

        for (CheckoutItem ci : req.items()) {
            if (ci.qty() < 1)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "QTY_MIN_1");

            Product p = productRepo.findById(ci.productId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND: " + ci.productId()));

            String[] labels = { p.getOption1Name(), p.getOption2Name(), p.getOption3Name(), p.getOption4Name(), p.getOption5Name() };
            boolean hasAnyLabel = Arrays.stream(labels).anyMatch(Objects::nonNull);

            Map<String,String> optMap = normalize(ci.options());
            String[] vals;

            if (hasAnyLabel) {
                if (optMap.isEmpty()) {
                    List<ProductVariant> all = variantRepo.findByProductId(p.getId());
                    if (all.size() == 1) {
                        ProductVariant only = all.get(0);
                        vals = new String[]{ only.getOption1Value(), only.getOption2Value(), only.getOption3Value(),
                                only.getOption4Value(), only.getOption5Value() };
                    } else {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "OPTION_REQUIRED: " + Arrays.toString(effectiveLabels(labels)));
                    }
                } else {
                    vals = mapToValues(labels, optMap);
                }
            } else {
                vals = new String[5];
            }

            ProductVariant v = variantRepo.matchOne(p.getId(), vals[0], vals[1], vals[2], vals[3], vals[4])
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "VARIANT_NOT_FOUND: " + snapshotKey(labels, vals)));

            if (v.getStock() < ci.qty())
                throw new ResponseStatusException(HttpStatus.CONFLICT, "OUT_OF_STOCK: " + snapshotKey(labels, vals));

            // 옵션가 ±50% 2차 방어
            int baseForCheck = (p.getSalePrice() > 0 ? p.getSalePrice() : p.getBasePrice());
            int limit = (int)Math.ceil(baseForCheck * 0.5);
            if (Math.abs(v.getAddPrice()) > limit) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OPTION_ADD_PRICE_EXCEEDS_50PCT");
            }

            int unit = baseForCheck + v.getAddPrice();
            String optionSnapshotJson = snapshotJson(labels, vals);

            order.getItems().add(OrderItem.builder()
                    .order(order)
                    .productId(p.getId())
                    .sellerId(p.getSellerId())
                    .productNameSnapshot(p.getName())
                    .unitPrice(unit)
                    .qty(ci.qty())
                    .feedbackPointSnapshot(p.getFeedbackPoint())
                    .optionSnapshotJson(optionSnapshotJson)
                    .build());

            total += unit * ci.qty();
        }

        // 결제 대상: 상품합계 + 배송비
        int payableBase = total + shippingFee;

        int balance = pointLedger.getBalance(userId);
        Integer reqUsePoint = req.usePoint();                   // null 허용
        boolean useAll = Boolean.TRUE.equals(req.useAllPoint());
        int want = useAll ? payableBase : (reqUsePoint == null ? balance : reqUsePoint);
        int usePoint = Math.max(0, Math.min(want, Math.min(balance, payableBase)));
        int pay = Math.max(0, payableBase - usePoint);

        order.setTotalPrice(total);
        order.setUsedPoint(usePoint);
        order.setPayAmount(pay);

        Order saved = orderRepo.save(order);
        saved.setOrderUid(newOrderUid(saved.getId()));
        orderRepo.save(saved);

        // 포인트 선차감(멱등)
        if (usePoint > 0) {
            pointLedger.spend(userId, usePoint, "ORDER_PAY_PRE", "order:pre:" + saved.getId());
        }

        // (추가) 0원 결제면 즉시 확정(재고 차감 + READY 승격)
        if (pay == 0) {
            finalizePaidByUid(saved.getOrderUid(), 0);
        }

        return new CheckoutResponse(
                saved.getId(),
                saved.getOrderUid(),
                total,
                shippingFee,
                usePoint,
                pay
        );
    }

    // =========================
    // ✅ 결제 승인 처리(UID 기반) : 재고 차감 + 상태 READY 승격
    // =========================
    @Transactional
    public void finalizePaidByUid(String orderUid, int paidAmount) {
        Order o = orderRepo.findByOrderUid(orderUid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        // 이미 READY 이상이면 멱등 처리
        if (o.getStatus() == OrderStatus.READY ||
                o.getStatus() == OrderStatus.IN_TRANSIT ||
                o.getStatus() == OrderStatus.DELIVERED ||
                o.getStatus() == OrderStatus.CONFIRMED) {
            return;
        }

        // 재고 차감 (PENDING/PAID 등 초기 상태에서만)
        for (OrderItem it : o.getItems()) {
            Product p = productRepo.findById(it.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));

            String[] labels = { p.getOption1Name(), p.getOption2Name(), p.getOption3Name(), p.getOption4Name(), p.getOption5Name() };
            String[] vals = valuesFromSnapshot(labels, it.getOptionSnapshotJson());

            ProductVariant v = variantRepo.matchOne(p.getId(), vals[0], vals[1], vals[2], vals[3], vals[4])
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "PAID_FINALIZE_VARIANT_MISSING: " + snapshotKey(labels, vals)));

            int updated = variantRepo.decreaseStockIfEnough(v.getId(), it.getQty());
            if (updated != 1) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "PAID_FINALIZE_OUT_OF_STOCK_OR_RACE: " + snapshotKey(labels, vals));
            }
            // ✅ 상품 총재고도 함께 감소
            int updatedTotal = productRepo.decreaseStockTotalIfEnough(p.getId(), it.getQty());
            if (updatedTotal != 1) {
                // 여기로 오면 SKU는 줄었는데 총재고가 경합으로 실패 → 운영상 안전하게 롤백시키려면 RuntimeException 던져 트랜잭션 전체 롤백
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "PAID_FINALIZE_STOCKTOTAL_RACE_OR_INCONSISTENT");
            }
        }

        // 승인 금액 반영 + READY로 승격
        o.setPayAmount(paidAmount);
        o.setStatus(OrderStatus.READY);
        orderRepo.save(o);
    }

    // 호환용(Long id) — 내부적으로 UID 버전 호출
    @Deprecated
    @Transactional
    public void finalizePaid(Long orderId) {
        Order o = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        finalizePaidByUid(o.getOrderUid(), o.getPayAmount());
    }

    @Transactional
    public void rollbackPointLock(Long orderId){
        Order o = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        rollbackPointLockByUid(o.getOrderUid());
    }

    // ✅ 실패/취소 시 UID 기반 포인트 롤백(멱등)
    @Transactional
    public void rollbackPointLockByUid(String orderUid){
        Order o = orderRepo.findByOrderUid(orderUid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        if (o.getUsedPoint() > 0) {
            pointLedger.accrue(o.getUserId(), o.getUsedPoint(), "ORDER_PAY_PRE_ROLLBACK", "order:pre:"+o.getId());
        }
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
    private static String[] effectiveLabels(String[] labels){
        return Arrays.stream(labels).filter(Objects::nonNull).toArray(String[]::new);
    }
    private static String[] mapToValues(String[] labels, Map<String,String> map){
        String[] vals = new String[5];
        for (int i = 0; i < 5; i++) {
            String label = labels[i];
            if (label == null) { vals[i] = null; continue; }
            String v = coalesce(map.get(label), map.get("option"+(i+1)+"Value"), map.get("option"+(i+1)));
            if (v == null || v.isBlank())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OPTION_REQUIRED: " + label);
            vals[i] = v.trim();
        }
        return vals;
    }
    private static String coalesce(String... ss){ for (String s: ss) if (s!=null && !s.isBlank()) return s; return null; }

    private String snapshotJson(String[] labels, String[] vals) {
        try {
            Map<String, String> m = new LinkedHashMap<>();
            for (int i = 0; i < labels.length; i++) {
                if (labels[i] != null) m.put(labels[i], vals[i]);
            }
            return objectMapper.writeValueAsString(m);
        } catch (Exception e) { return "{}"; }
    }
    private String[] valuesFromSnapshot(String[] labels, String snapshotJson) {
        Map<String, String> m = Collections.emptyMap();
        try {
            if (snapshotJson != null && !snapshotJson.isBlank()) {
                m = objectMapper.readValue(snapshotJson, new TypeReference<Map<String, String>>() {});
            }
        } catch (Exception ignore) {}
        String[] vals = new String[5];
        for (int i = 0; i < labels.length; i++) {
            vals[i] = (labels[i] == null) ? null : m.get(labels[i]);
        }
        return vals;
    }
    private static String snapshotKey(String[] labels, String[] vals) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < labels.length; i++) {
            if (labels[i] != null) {
                if (!sb.isEmpty()) sb.append(", ");
                sb.append(labels[i]).append("=").append(vals[i]);
            }
        }
        return sb.toString();
    }

    private static String newOrderUid(Long id) {
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String rand = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
        return "ORD-" + date + "-" + String.format("%08d", id) + "-" + rand;
    }

    private static String sanitizeMemo(String s) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return (t.length() > 200) ? t.substring(0, 200) : t;
    }
}
