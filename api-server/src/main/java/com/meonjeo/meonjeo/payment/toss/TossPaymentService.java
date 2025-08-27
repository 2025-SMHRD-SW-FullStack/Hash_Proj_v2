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

    private final WebClient tossWebClient;
    private final OrderRepository orderRepo;
    private final OrderService orderService;
    private final PaymentRepository payRepo;
    private final ObjectMapper om = new ObjectMapper();

    @Transactional
    public TossConfirmResponse confirm(TossConfirmRequest req){
        // 1) 주문 조회
        Order o = orderRepo.findByOrderUid(req.orderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        // 2) 0원 결제(포인트 전액) 멱등 처리
        if (o.getPayAmount() == 0) {
            String zeroKey = "ZERO_PAY:" + o.getOrderUid(); // ★ 유니크 키(주문별)
            try {
                payRepo.save(Payment.builder()
                        .orderId(o.getId()).provider("TOSS")
                        .paymentKey(zeroKey).method("POINT_ONLY")
                        .amount(0).approvedAt(OffsetDateTime.now())
                        .rawResponseJson("{\"zeroPay\":true}")
                        .build());
            } catch (DataIntegrityViolationException ignore) {/* 멱등 */}
            if (o.getStatus() != OrderStatus.PAID) orderService.finalizePaid(o.getId());
            return new TossConfirmResponse(o.getOrderUid(), zeroKey, "POINT_ONLY", 0, OffsetDateTime.now().toString());
        }

        // 3) 금액 검증(클라이언트 조작 방지)
        if (o.getPayAmount() != req.amount()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AMOUNT_MISMATCH");
        }

        // 4) 멱등1: 같은 paymentKey로 이미 처리됨?
        Payment existed = payRepo.findByPaymentKey(req.paymentKey()).orElse(null);
        if (existed != null) {
            if (Objects.equals(existed.getOrderId(), o.getId()) && existed.getAmount() == req.amount()) {
                if (o.getStatus() != OrderStatus.PAID) orderService.finalizePaid(o.getId());
                return new TossConfirmResponse(
                        o.getOrderUid(), existed.getPaymentKey(), existed.getMethod(),
                        existed.getAmount(), String.valueOf(existed.getApprovedAt())
                );
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "DUPLICATE_PAYMENT_KEY_FOR_DIFFERENT_ORDER");
        }

        // 5) 멱등2: 이미 주문이 PAID면 중복 호출로 간주하여 응답
        if (o.getStatus() == OrderStatus.PAID) {
            return new TossConfirmResponse(o.getOrderUid(), req.paymentKey(), "UNKNOWN", o.getPayAmount(), OffsetDateTime.now().toString());
        }

        // 6) Toss 승인 호출(서버-서버, Basic Auth는 WebClient에 주입됨)
        Map<String,Object> res;
        try {
            res = tossWebClient.post()
                    .uri("/v1/payments/confirm")
                    .bodyValue(Map.of(
                            "paymentKey", req.paymentKey(),
                            "orderId", req.orderId(),   // 우리 서버의 orderUid
                            "amount", req.amount()
                    ))
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, clientResponse ->
                            clientResponse.bodyToMono(Map.class).defaultIfEmpty(Map.of())
                                    .map(body -> {
                                        // 외부 상세는 마스킹, 상태코드만 반영
                                        HttpStatus status = HttpStatus.valueOf(clientResponse.statusCode().value());
                                        return new ResponseStatusException(status, "TOSS_CONFIRM_FAILED");
                                    })
                    )
                    .bodyToMono(Map.class)
                    .block();
        } catch (ResponseStatusException e) {
            // onStatus에서 올린 예외 그대로
            throw e;
        } catch (WebClientResponseException e) {
            // 네트워크/프로토콜 오류 → 502로 마스킹
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TOSS_UPSTREAM_ERROR");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TOSS_COMMUNICATION_ERROR");
        }

        // 7) 응답 상호 대조(추가 방어)
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

        // 8) 저장(유니크 충돌 시 멱등 전환)
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

        // 9) 주문 PAID 처리(멱등)
        orderService.finalizePaid(o.getId());

        return new TossConfirmResponse(o.getOrderUid(), req.paymentKey(), methodRaw, req.amount(), String.valueOf(approvedAt));
    }

    @Transactional
    public void fail(TossFailRequest req){
        // 위젯 실패/취소: 포인트 선차감 복구(멱등)
        Order o = orderRepo.findByOrderUid(req.orderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        orderService.rollbackPointLock(o.getId());
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
