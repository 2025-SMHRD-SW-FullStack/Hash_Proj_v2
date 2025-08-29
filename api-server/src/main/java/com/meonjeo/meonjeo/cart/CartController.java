package com.meonjeo.meonjeo.cart;

import com.meonjeo.meonjeo.cart.dto.AddCartItemRequest;
import com.meonjeo.meonjeo.cart.dto.CartViewResponse;
import com.meonjeo.meonjeo.cart.dto.UpdateCartItemQtyRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name="장바구니")
@RestController
@RequestMapping("/api/me/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @Operation(summary="장바구니 조회(현재 가격/재고 반영)")
    @GetMapping
    public CartViewResponse get(){ return cartService.getView(); }

    @Operation(summary="장바구니 담기(동일 SKU면 수량 합침)")
    @PostMapping("/items")
    public CartViewResponse add(@RequestBody @Valid AddCartItemRequest req){
        cartService.add(req);
        return cartService.getView();
    }

    @Operation(summary="수량 변경")
    @PutMapping("/items/{cartItemId}")
    public CartViewResponse updateQty(@PathVariable Long cartItemId, @RequestBody @Valid UpdateCartItemQtyRequest req){
        cartService.updateQty(cartItemId, req.qty());
        return cartService.getView();
    }

    @Operation(summary="단건 삭제")
    @DeleteMapping("/items/{cartItemId}")
    public CartViewResponse remove(@PathVariable Long cartItemId){
        cartService.remove(cartItemId);
        return cartService.getView();
    }

    @Operation(summary="전체 비우기")
    @DeleteMapping
    public CartViewResponse clear(){
        cartService.clear();
        return cartService.getView();
    }
}
