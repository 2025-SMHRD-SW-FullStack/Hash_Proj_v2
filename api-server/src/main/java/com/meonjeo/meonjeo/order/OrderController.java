package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.order.dto.CheckoutRequest;
import com.meonjeo.meonjeo.order.dto.CheckoutResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name="주문/결제")
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @Operation(summary="체크아웃(포인트 전액/지정액 사용 지원, 0원 결제 허용)")
    @PostMapping("/checkout")
    public CheckoutResponse checkout(@RequestBody @Valid CheckoutRequest req) {
        return orderService.checkout(req);
    }
}
