package com.meonjeo.meonjeo.payment.toss;

import com.meonjeo.meonjeo.payment.toss.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name="결제(Toss)")
@RestController
@RequestMapping("/api/payments/toss")
@RequiredArgsConstructor
public class TossPaymentController {

    private final TossPaymentService service;

    // ===== 기존 JSON POST =====

    @Operation(summary="결제 승인 확인(클라이언트가 JSON POST로 호출)")
    @PostMapping("/confirm")
    public TossConfirmResponse confirm(@RequestBody TossConfirmRequest req){
        return service.confirm(req);
    }

    @Operation(summary="결제 실패/취소 처리(클라이언트가 JSON POST로 호출)")
    @PostMapping("/fail")
    public ResponseEntity<Void> fail(@RequestBody TossFailRequest req){
        service.fail(req);
        return ResponseEntity.noContent().build();
    }

    // ===== 신규 GET 어댑터 (리다이렉트 쿼리 파라미터 그대로 받기) =====

    @Operation(summary="결제 승인 확인(GET 쿼리 파라미터로 호출 가능)")
    @GetMapping("/confirm")
    public TossConfirmResponse confirmGet(
            @RequestParam("paymentKey") String paymentKey,
            @RequestParam("orderId") String orderId,
            @RequestParam("amount") int amount
    ){
        return service.confirm(new TossConfirmRequest(paymentKey, orderId, amount));
    }

    @Operation(summary="결제 실패/취소 처리(GET 쿼리 파라미터로 호출 가능)")
    @GetMapping("/fail")
    public ResponseEntity<Void> failGet(
            @RequestParam("orderId") String orderId,
            @RequestParam(value = "message", required = false) String message,
            @RequestParam(value = "code", required = false) String code
    ){
        service.fail(new TossFailRequest(orderId, message, code));
        return ResponseEntity.noContent().build();
    }
}
