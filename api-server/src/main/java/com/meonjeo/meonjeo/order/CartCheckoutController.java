package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.cart.CartService;
import com.meonjeo.meonjeo.order.dto.CheckoutCartRequest;
import com.meonjeo.meonjeo.order.dto.CheckoutRequest;
import com.meonjeo.meonjeo.order.dto.CheckoutResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name="장바구니 결제")
@RestController
@RequestMapping("/api/me/checkout")
@RequiredArgsConstructor
public class CartCheckoutController {

    private final CartService cartService;
    private final OrderService orderService;

    @Operation(summary="장바구니 전체 결제(0원 결제 포함)")
    @PostMapping("/cart")
    public CheckoutResponse checkoutCart(@RequestBody @Valid CheckoutCartRequest req){

        var sel = (req.items() != null && !req.items().isEmpty()) ? req.items() : req.cartItemIds();

        // 장바구니 → CheckoutItem 리스트로 변환
        var items = (sel != null && !sel.isEmpty())
                ? cartService.buildCheckoutItems(sel)
                : cartService.buildCheckoutItems();
        // 기존 checkout 로직 재사용
        CheckoutRequest core = new CheckoutRequest(
                req.addressId(),
                req.requestMemo(),
                req.useAllPoint(),
                req.usePoint(),
                items
        );
        CheckoutResponse resp = orderService.checkout(core);

        // 결제요청 후 장바구니 비우기(옵션)
        if (req.clearCartAfter()) {
            if (sel != null && !sel.isEmpty()) cartService.clearSelected(sel);
            else cartService.clear();
        }
        return resp;
    }
}
