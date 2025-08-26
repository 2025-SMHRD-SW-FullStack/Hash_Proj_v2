package com.meonjeo.meonjeo.payment.toss;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.order.Order;
import com.meonjeo.meonjeo.order.OrderRepository;
import com.meonjeo.meonjeo.order.OrderService;
import com.meonjeo.meonjeo.payment.Payment;
import com.meonjeo.meonjeo.payment.PaymentRepository;
import com.meonjeo.meonjeo.payment.toss.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.OffsetDateTime;
import java.util.Map;

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
        // 0원 결제 → Toss 생략 경로
        Order o = orderRepo.findByOrderUid(req.orderId()).orElseThrow();
        if (o.getPayAmount() == 0) {
            payRepo.save(Payment.builder()
                    .orderId(o.getId()).provider("TOSS")
                    .paymentKey("ZERO_PAY").method("POINT_ONLY")
                    .amount(0).approvedAt(OffsetDateTime.now())
                    .rawResponseJson("{\"zeroPay\":true}")
                    .build());
            orderService.finalizePaid(o.getId());
            return new TossConfirmResponse(o.getOrderUid(), "ZERO_PAY", "POINT_ONLY", 0, OffsetDateTime.now().toString());
        }

        // 금액 검증
        if (o.getPayAmount() != req.amount()) {
            throw new IllegalArgumentException("결제 금액 불일치");
        }
        if (o.getStatus() == OrderStatus.PAID) {
            // 멱등 처리: 이미 승인된 주문이면 저장된 payment 리턴
            var p = payRepo.findByPaymentKey(req.paymentKey()).orElse(null);
            String method = p != null ? p.getMethod() : "UNKNOWN";
            return new TossConfirmResponse(o.getOrderUid(), req.paymentKey(), method, o.getPayAmount(), OffsetDateTime.now().toString());
        }

        // Toss 승인 호출
        Map<String,Object> body = Map.of(
                "paymentKey", req.paymentKey(),
                "orderId", req.orderId(),
                "amount", req.amount()
        );

        Map<String,Object> res = tossWebClient.post()
                .uri("/v1/payments/confirm")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        // ✅ method/approvedAt 안전 파싱 (제네릭 캡처 충돌 제거)
        String methodRaw = asString(res.get("method"), "CARD"); // 카드/가상계좌/간편결제 등
        String approvedAtStr = asString(res.get("approvedAt"), OffsetDateTime.now().toString());
        OffsetDateTime approvedAt = safeParseOffsetDateTime(approvedAtStr);

        // 저장
        payRepo.save(Payment.builder()
                .orderId(o.getId()).provider("TOSS")
                .paymentKey(req.paymentKey()).method(methodRaw)
                .amount(req.amount())
                .approvedAt(approvedAt)
                .rawResponseJson(writeJson(res))
                .build());

        // 주문 확정 처리
        orderService.finalizePaid(o.getId());

        return new TossConfirmResponse(o.getOrderUid(), req.paymentKey(), methodRaw, req.amount(), approvedAtStr);
    }

    @Transactional
    public void fail(TossFailRequest req){
        // 리다이렉트 실패 시 호출: 포인트 잠금 복구
        Order o = orderRepo.findByOrderUid(req.orderId()).orElseThrow();
        orderService.rollbackPointLock(o.getId());
    }

    private String writeJson(Object o){
        try { return om.writeValueAsString(o); } catch (Exception e) { return "{}"; }
    }

    // ===== helpers =====
    private static String asString(Object v, String def){
        return v == null ? def : String.valueOf(v);
    }
    private static OffsetDateTime safeParseOffsetDateTime(String s){
        try { return OffsetDateTime.parse(s); } catch (Exception e){ return OffsetDateTime.now(); }
    }
}
