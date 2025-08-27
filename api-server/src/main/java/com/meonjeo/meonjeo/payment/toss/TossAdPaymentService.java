package com.meonjeo.meonjeo.payment.toss;

import com.meonjeo.meonjeo.ad.AdService;
import com.meonjeo.meonjeo.ad.AdBookingRepository;
import com.meonjeo.meonjeo.payment.Payment;
import com.meonjeo.meonjeo.payment.PaymentRepository;
import com.meonjeo.meonjeo.payment.toss.dto.TossAdConfirmRequest;
import com.meonjeo.meonjeo.payment.toss.dto.TossAdConfirmResponse;
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
public class TossAdPaymentService {

    private final WebClient tossWebClient;
    private final AdService adService;
    private final PaymentRepository payRepo;
    private final AdBookingRepository bookingRepo;

    @Transactional
    public TossAdConfirmResponse confirm(TossAdConfirmRequest req){
        // 1) 멱등: 이미 처리된 paymentKey?
        Payment existed = payRepo.findByPaymentKey(req.paymentKey()).orElse(null);
        if (existed != null) {
            if (Objects.equals(existed.getAdBookingId(), req.bookingId()) && existed.getAmount() == req.amount()) {
                return new TossAdConfirmResponse(req.bookingId(), existed.getPaymentKey(), existed.getAmount(),
                        String.valueOf(existed.getApprovedAt()));
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "DUPLICATE_PAYMENT_KEY_FOR_DIFFERENT_BOOKING");
        }

        // 2) 금액 검증(예약 가격과 동일해야 함)
        var booking = bookingRepo.findById(req.bookingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND"));
        if (booking.getPrice() != req.amount()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AMOUNT_MISMATCH");
        }

        // 3) Toss 승인 호출
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
                                        var status = HttpStatus.valueOf(clientResponse.statusCode().value());
                                        return new ResponseStatusException(status, "TOSS_CONFIRM_FAILED");
                                    })
                    )
                    .bodyToMono(Map.class)
                    .block();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (WebClientResponseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TOSS_UPSTREAM_ERROR");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "TOSS_COMMUNICATION_ERROR");
        }

        // 4) 응답 상호 대조(추가 방어)
        String resOrderId = asString(res.get("orderId"), null);
        if (resOrderId != null && !Objects.equals(resOrderId, req.orderId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ORDER_ID_MISMATCH");
        }
        Integer resTotal = asInt(res.get("totalAmount"));
        if (resTotal != null && resTotal != req.amount()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AMOUNT_MISMATCH_TOSS");
        }

        String method = asString(res.get("method"), "CARD");
        String approvedAtStr = asString(res.get("approvedAt"), OffsetDateTime.now().toString());
        OffsetDateTime approvedAt = safeParseOffsetDateTime(approvedAtStr);

        // 5) 저장(유니크 충돌 시 멱등)
        try {
            payRepo.save(Payment.builder()
                    .adBookingId(req.bookingId())
                    .provider("TOSS")
                    .paymentKey(req.paymentKey())
                    .method(method)
                    .amount(req.amount())
                    .approvedAt(approvedAt)
                    .rawResponseJson(toJson(res))
                    .build());
        } catch (DataIntegrityViolationException ignore) {
            Payment p = payRepo.findByPaymentKey(req.paymentKey()).orElseThrow();
            approvedAt = p.getApprovedAt();
        }

        // 6) 예약 결제 완료 처리
        adService.markPaid(req.bookingId());

        return new TossAdConfirmResponse(req.bookingId(), req.paymentKey(), req.amount(), String.valueOf(approvedAt));
    }

    // ===== helpers =====
    private static String toJson(Object o){
        try { return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(o); }
        catch (Exception e) { return "{}"; }
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
