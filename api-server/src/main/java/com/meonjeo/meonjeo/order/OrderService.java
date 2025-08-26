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
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepo;
    private final ProductRepository productRepo;
    private final ProductVariantRepository variantRepo;
    private final UserAddressRepository addressRepo;   // ⬅️ 추가
    private final PointLedgerPort pointLedger;
    private final ObjectMapper objectMapper;
    private final AuthSupport auth;                   // ⬅️ 추가

    private Long currentUserId() { return auth.currentUserId(); }

    /** 체크아웃: 주소록 기반 + 옵션 Map 매칭 */
    @Transactional
    public CheckoutResponse checkout(CheckoutRequest req) {

        Long userId = currentUserId();

        // 0) 주소 소유권 검증 + 스냅샷
        UserAddress addr = addressRepo.findByIdAndUserId(req.addressId(), userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "ADDRESS_NOT_FOUND_OR_FORBIDDEN"));

        Order order = Order.builder()
                .userId(userId)
                .status(OrderStatus.PENDING)
                .receiver(addr.getReceiver())
                .phone(addr.getPhone())
                .addr1(addr.getAddr1())
                .addr2(addr.getAddr2())
                .zipcode(addr.getZipcode())
                .requestMemo(req.requestMemo())
                .createdAt(java.time.LocalDateTime.now())
                .build();

        // ✅ 빌더가 null로 만드는 걸 대비해 안전 초기화
        if (order.getItems() == null) {
            order.setItems(new ArrayList<>());
        }

        int total = 0;

        for (CheckoutItem ci : req.items()) {
            if (ci.qty() < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "QTY_MIN_1");

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

            int base = p.getSalePrice() > 0 ? p.getSalePrice() : p.getBasePrice();
            int unit = base + v.getAddPrice();

            String optionSnapshotJson = snapshotJson(labels, vals);

            order.getItems().add(OrderItem.builder()
                    .order(order)
                    .productId(p.getId())
                    .productNameSnapshot(p.getName())
                    .unitPrice(unit)
                    .qty(ci.qty())
                    .optionSnapshotJson(optionSnapshotJson)
                    .build());

            total += unit * ci.qty();
        }

        int balance = pointLedger.getBalance(userId);
        int want = req.useAllPoint() ? total : req.usePoint();
        int usePoint = Math.max(0, Math.min(want, Math.min(balance, total)));
        int pay = Math.max(0, total - usePoint);

        if (usePoint > 0) {
            pointLedger.spend(userId, usePoint, "ORDER_PAY", "order:pre");
        }

        order.setTotalPrice(total);
        order.setUsedPoint(usePoint);
        order.setPayAmount(pay);

        Order saved = orderRepo.save(order);
        saved.setOrderUid(newOrderUid(saved.getId()));
        orderRepo.save(saved);

        return new CheckoutResponse(saved.getId(), saved.getOrderUid(), total, usePoint, pay);
    }

    @Transactional
    public void finalizePaid(Long orderId) {
        Order o = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        if (o.getStatus() == OrderStatus.PAID) return;

        for (OrderItem it : o.getItems()) {
            Product p = productRepo.findById(it.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));

            String[] labels = { p.getOption1Name(), p.getOption2Name(), p.getOption3Name(), p.getOption4Name(), p.getOption5Name() };
            String[] vals = valuesFromSnapshot(labels, it.getOptionSnapshotJson());

            ProductVariant v = variantRepo.matchOne(p.getId(), vals[0], vals[1], vals[2], vals[3], vals[4])
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                            "PAID_FINALIZE_VARIANT_MISSING: " + snapshotKey(labels, vals)));

            if (v.getStock() < it.getQty())
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "PAID_FINALIZE_OUT_OF_STOCK: " + snapshotKey(labels, vals));

            v.setStock(v.getStock() - it.getQty());
        }

        o.setStatus(OrderStatus.PAID);
        orderRepo.save(o);
    }

    @Transactional
    public void rollbackPointLock(Long orderId){
        Order o = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        if (o.getUsedPoint() > 0) {
            pointLedger.accrue(o.getUserId(), o.getUsedPoint(), "ORDER_CANCEL", "order:cancel:"+o.getId());
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
}
