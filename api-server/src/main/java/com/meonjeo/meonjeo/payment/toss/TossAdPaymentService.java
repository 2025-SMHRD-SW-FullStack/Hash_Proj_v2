package com.meonjeo.meonjeo.payment.toss;

import com.meonjeo.meonjeo.ad.AdService;
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
public class TossAdPaymentService {

    private final WebClient tossWebClient;
    private final AdService adService;
    private final PaymentRepository payRepo;

    @Transactional
    public TossAdConfirmResponse confirm(TossAdConfirmRequest req){
        // Toss 승인
        Map<String,Object> res = tossWebClient.post()
                .uri("/v1/payments/confirm")
                .bodyValue(Map.of(
                        "paymentKey", req.paymentKey(),
                        "orderId", req.orderId(),
                        "amount", req.amount()
                ))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        String approvedAt = res.getOrDefault("approvedAt", OffsetDateTime.now().toString()).toString();

        // 결제 저장
        payRepo.save(Payment.builder()
                .adBookingId(req.bookingId())
                .provider("TOSS").paymentKey(req.paymentKey())
                .method(res.getOrDefault("method","CARD").toString())
                .amount(req.amount())
                .approvedAt(OffsetDateTime.parse(approvedAt))
                .rawResponseJson(toJson(res))
                .build());

        // 예약 확정(RESERVED_PAID) + 필요시 즉시 활성화
        adService.markPaid(req.bookingId());

        return new TossAdConfirmResponse(req.bookingId(), req.paymentKey(), req.amount(), approvedAt);
    }

    private String toJson(Object o){
        try { return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(o); }
        catch (Exception e) { return "{}"; }
    }
}
