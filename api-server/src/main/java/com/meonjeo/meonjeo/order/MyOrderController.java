package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.order.dto.MyOrderDetailResponse;
import com.meonjeo.meonjeo.order.dto.MyOrderItemView;
import com.meonjeo.meonjeo.order.dto.MyOrderSummaryResponse;
import com.meonjeo.meonjeo.security.AuthSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Tag(name = "내 주문")
@RestController
@RequestMapping("/api/me/orders")
@RequiredArgsConstructor
public class MyOrderController {

    private final OrderRepository orderRepo;
    private final AuthSupport auth;

    private Long uid() { return auth.currentUserId(); }

    @Operation(summary = "내 주문 목록")
    @GetMapping
    public List<MyOrderSummaryResponse> list() {
        return orderRepo.findByUserIdOrderByIdDesc(uid()).stream()
                .map(o -> new MyOrderSummaryResponse(
                        o.getId(), o.getOrderUid(), o.getStatus(),
                        o.getTotalPrice(), o.getUsedPoint(), o.getPayAmount(),
                        o.getCreatedAt()
                ))
                .toList();
    }

    @Operation(summary = "내 주문 상세")
    @GetMapping("/{id}")
    public MyOrderDetailResponse detail(@PathVariable Long id) {
        Order o = orderRepo.findByIdAndUserId(id, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        List<MyOrderItemView> items = o.getItems().stream()
                .map(it -> new MyOrderItemView(
                        it.getId(), it.getProductId(),
                        it.getProductNameSnapshot(),
                        it.getUnitPrice(), it.getQty(),
                        it.getOptionSnapshotJson()
                ))
                .toList();

        return new MyOrderDetailResponse(
                o.getId(), o.getOrderUid(), o.getStatus(),
                o.getTotalPrice(), o.getUsedPoint(), o.getPayAmount(),
                o.getReceiver(), o.getPhone(), o.getAddr1(), o.getAddr2(), o.getZipcode(),
                o.getRequestMemo(), o.getCreatedAt(), o.getConfirmedAt(),
                items
        );
    }
}
