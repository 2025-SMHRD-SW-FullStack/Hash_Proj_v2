package com.meonjeo.meonjeo.payment.toss;

import com.meonjeo.meonjeo.payment.toss.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name="결제(Toss)")
@RestController @RequestMapping("/api/payments/toss")
@RequiredArgsConstructor
public class TossPaymentController {

    private final TossPaymentService service;

    @Operation(summary="결제 승인 확인(위젯 성공 후)")
    @PostMapping("/confirm")
    public TossConfirmResponse confirm(@RequestBody TossConfirmRequest req){
        return service.confirm(req);
    }

    @Operation(summary="결제 실패/취소 처리(위젯 실패 후)")
    @PostMapping("/fail")
    public void fail(@RequestBody TossFailRequest req){
        service.fail(req);
    }
}
