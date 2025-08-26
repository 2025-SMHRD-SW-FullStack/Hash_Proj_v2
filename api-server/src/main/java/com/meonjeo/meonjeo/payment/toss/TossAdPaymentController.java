package com.meonjeo.meonjeo.payment.toss;

import com.meonjeo.meonjeo.payment.toss.dto.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name="결제(Toss) - 광고")
@RestController @RequestMapping("/api/payments/toss/ad")
@RequiredArgsConstructor
public class TossAdPaymentController {
    private final TossAdPaymentService service;

    @Operation(summary="광고 결제 승인 확인")
    @PostMapping("/confirm")
    public TossAdConfirmResponse confirm(@RequestBody TossAdConfirmRequest req){
        return service.confirm(req);
    }
}
