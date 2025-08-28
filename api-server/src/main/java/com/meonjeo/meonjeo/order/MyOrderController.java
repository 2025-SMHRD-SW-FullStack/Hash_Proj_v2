package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.order.dto.MyOrderDetailResponse;
import com.meonjeo.meonjeo.order.dto.MyOrderItemView;
import com.meonjeo.meonjeo.order.dto.MyOrderSummaryResponse;
import com.meonjeo.meonjeo.order.dto.OrderWindowResponse;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.shipment.ShipmentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Tag(name = "내 주문")
@RestController
@RequestMapping("/api/me/orders")
@RequiredArgsConstructor
public class MyOrderController {

    private final OrderRepository orderRepo;
    private final AuthSupport auth;
    private final OrderWindowService windowService;
    private final ShipmentRepository shipmentRepo;

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

    @Operation(summary = "주문의 구매확정/피드백 가능 윈도우 조회 (교환 재배송 포함 최신 배송완료 기준)")
    @GetMapping("/{id}/window")
    public OrderWindowResponse window(@PathVariable Long id) {
        // 소유권 확인
        orderRepo.findByIdAndUserId(id, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));
        return windowService.getWindow(id);
    }

    @Operation(summary = "주문 수동 구매확정 (배송완료 이후 ~ 7일 이내, 교환 재배송 포함 최신 배송완료 기준)")
    @PostMapping("/{id}/confirm")
    public MyOrderDetailResponse manualConfirm(@PathVariable Long id) {
        // 소유권 및 존재 확인
        Order o = orderRepo.findByIdAndUserId(id, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        // 이미 확정?
        if (o.getConfirmedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ALREADY_CONFIRMED");
        }

        // 미배송 출고가 남아있다면 확정 불가
        long undelivered = shipmentRepo.countByOrderIdAndDeliveredAtIsNull(o.getId());
        if (undelivered > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "HAS_UNDELIVERED_SHIPMENTS");
        }

        // 윈도우(최신 배송완료 ~ +7일) 내인지 확인
        if (!windowService.isOpen(o.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "CONFIRM_WINDOW_CLOSED");
        }

        // 상태가 배송완료가 아니라면 방어
        if (o.getStatus() != OrderStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "INVALID_STATUS");
        }

        // 확정 처리
        o.setStatus(OrderStatus.CONFIRMED);
        o.setConfirmedAt(LocalDateTime.now());
        o.setConfirmationType(Order.ConfirmationType.MANUAL);
        orderRepo.save(o);

        // 확정 후 상세 반환(프론트 새로고침 없이 갱신용)
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
