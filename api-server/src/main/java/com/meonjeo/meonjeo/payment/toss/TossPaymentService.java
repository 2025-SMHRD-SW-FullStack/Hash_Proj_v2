package com.meonjeo.meonjeo.payment.toss;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.order.Order;
import com.meonjeo.meonjeo.order.OrderRepository;
import com.meonjeo.meonjeo.order.OrderService;
import com.meonjeo.meonjeo.payment.Payment;
import com.meonjeo.meonjeo.payment.PaymentRepository;
import com.meonjeo.meonjeo.payment.toss.dto.TossConfirmRequest;
import com.meonjeo.meonjeo.payment.toss.dto.TossConfirmResponse;
import com.meonjeo.meonjeo.payment.toss.dto.TossFailRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TossPaymentService {

    private static final Logger log = LoggerFactory.getLogger(TossPaymentService.class);

    private final WebClient tossWebClient;
    private final OrderRepository orderRepo;
    private final OrderService orderService;
    private final PaymentRepository payRepo;
    private final ObjectMapper om = new ObjectMapper();

    @Transactional
    public TossConfirmResponse confirm(TossConfirmRequest req){
        // 1) 주문 조회 (req.orderId == orderUid)
        Order o = orderRepo.findByOrderUid(req.orderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        // 2) 0원 결제(포인트 전액) 멱등 처리
        if (o.getPayAmount() == 0) {
            String zeroKey = "ZERO_PAY:" + o.getOrderUid();
            try {
                payRepo.save(Payment.builder()
                        .orderId(o.getId()).provider("TOSS")
                        .paymentKey(zeroKey).method("POINT_ONLY")
                        .amount(0).approvedAt(OffsetDateTime.now())
                        .rawResponseJson("{\"zeroPay\":true}")
                        .build());
            } catch (DataIntegrityViolationException ignore) {/* 멱등 */}
            orderService.finalizePaidByUid(o.getOrderUid(), 0);
            // ✅ 수정: 0원 결제 시에도 orderDbId(o.getId())를 포함하여 반환
            return new TossConfirmResponse(o.getId(), o.getOrderUid(), zeroKey, "POINT_ONLY", 0, OffsetDateTime.now().toString());
        }

        // 3) 금액 검증
        if (o.getPayAmount() != req.amount()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AMOUNT_MISMATCH");
        }

        // 4) 멱등1: 같은 paymentKey로 이미 처리됨?
        Payment existed = payRepo.findByPaymentKey(req.paymentKey()).orElse(null);
        if (existed != null) {
            if (Objects.equals(existed.getOrderId(), o.getId()) && existed.getAmount() == req.amount()) {
                orderService.finalizePaidByUid(req.orderId(), req.amount());
                // ✅ 수정: 이 경우에도 orderDbId(o.getId())를 포함하여 반환
                return new TossConfirmResponse(
                        o.getId(),
                        o.getOrderUid(),
                        existed.getPaymentKey(),
                        existed.getMethod(),
                        existed.getAmount(),
                        String.valueOf(existed.getApprovedAt())
                );
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "DUPLICATE_PAYMENT_KEY_FOR_DIFFERENT_ORDER");
        }

        // 5) 이미 READY 이상이면 기존 결제 정보 반환(재요청 UX)
        if (o.getStatus() == OrderStatus.READY ||
                o.getStatus() == OrderStatus.IN_TRANSIT ||
                o.getStatus() == OrderStatus.DELIVERED ||
                o.getStatus() == OrderStatus.CONFIRMED) {
            Payment p = payRepo.findFirstByOrderIdOrderByIdDesc(o.getId()).orElse(null);
            String method = (p != null && p.getMethod() != null) ? p.getMethod() : "UNKNOWN";
            OffsetDateTime approvedAt = (p != null && p.getApprovedAt() != null) ? p.getApprovedAt() : OffsetDateTime.now();
            // ✅ 수정: 이 경우에도 orderDbId(o.getId())를 포함하여 반환
            return new TossConfirmResponse(o.getId(), o.getOrderUid(), req.paymentKey(), method, o.getPayAmount(), String.valueOf(approvedAt));
        }

        // 6) Toss 승인 호출 (이하 로직은 기존과 동일)
        Map<String,Object> res;
        try {
            res = tossWebClient.post()
                    .uri("/v1/payments/confirm")
                    .bodyValue(Map.of(
                            "paymentKey", req.paymentKey(),
                            "orderId", req.orderId(),
                            "amount", req.amount()
                    ))
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, clientResponse ->
                            clientResponse.bodyToMono(Map.class).defaultIfEmpty(Map.of())
                                    .map(body -> {
                                        HttpStatus status = HttpStatus.valueOf(clientResponse.statusCode().value());
                                        log.warn("TOSS_CONFIRM_FAILED status={} orderId={} body={}", status, req.orderId(), body);
                                        return new ResponseStatusException(status, "TOSS_CONFIRM_FAILED");
                                    })
                    )
                    .bodyToMono(Map.class)
                    .block();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (WebClientResponseException e) {
            log.error("TOSS_UPSTREAM_ERROR orderId={} status={} body={}", req.orderId(), e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TOSS_UPSTREAM_ERROR");
        } catch (Exception e) {
            log.error("TOSS_COMMUNICATION_ERROR orderId={} err={}", req.orderId(), e.toString());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TOSS_COMMUNICATION_ERROR");
        }

        // 7) 응답 상호 대조
        String resOrderId = asString(res.get("orderId"), null);
        if (resOrderId != null && !Objects.equals(resOrderId, req.orderId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ORDER_ID_MISMATCH");
        }
        Integer resTotal = asInt(res.get("totalAmount"));
        if (resTotal != null && resTotal != req.amount()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AMOUNT_MISMATCH_TOSS");
        }

        String methodRaw = asString(res.get("method"), "CARD");
        String approvedAtStr = asString(res.get("approvedAt"), OffsetDateTime.now().toString());
        OffsetDateTime approvedAt = safeParseOffsetDateTime(approvedAtStr);

        // 8) 저장(유니크 충돌 시 멱등)
        try {
            payRepo.save(Payment.builder()
                    .orderId(o.getId()).provider("TOSS")
                    .paymentKey(req.paymentKey()).method(methodRaw)
                    .amount(req.amount())
                    .approvedAt(approvedAt)
                    .rawResponseJson(writeJson(res))
                    .build());
        } catch (DataIntegrityViolationException ignore) {
            Payment p = payRepo.findByPaymentKey(req.paymentKey()).orElseThrow();
            methodRaw = p.getMethod();
            approvedAt = p.getApprovedAt();
        }

        // 9) ✅ 결제 승인 처리 — 재고 차감 + READY 승격 (UID 기반)
        orderService.finalizePaidByUid(req.orderId(), req.amount());

        // ✅ 수정: 최종 반환 시에도 orderDbId(o.getId())를 포함하여 반환
        return new TossConfirmResponse(o.getId(), o.getOrderUid(), req.paymentKey(), methodRaw, req.amount(), String.valueOf(approvedAt));
    }

    @Transactional
    public void fail(TossFailRequest req){
        orderService.rollbackPointLockByUid(req.orderId());
    }

    // ===== helpers =====
    private String writeJson(Object o){
        try { return om.writeValueAsString(o); } catch (Exception e) { return "{}"; }
    }
    private static String asString(Object v, String def){
        return v == null ? def : String.valueOf(v);
    }
    private static Integer asInt(Object v){
        try { return v == null ? null : Integer.valueOf(String.valueOf(v)); }
        catch (Exception ignore) { return null; }
    }
    private static OffsetDateTime safeParseOffsetDateTime(String s){
        try { return OffsetDateTime.parse(s); } catch (Exception e){ return OffsetDateTime.now(); }
    }
}
