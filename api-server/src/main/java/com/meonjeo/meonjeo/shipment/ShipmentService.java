package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.common.ShipmentStatus;
import com.meonjeo.meonjeo.order.Order;
import com.meonjeo.meonjeo.order.OrderItem;
import com.meonjeo.meonjeo.order.OrderRepository; // 기존에 존재하는 리포지토리 가정
import com.meonjeo.meonjeo.shipment.dto.*;
import com.meonjeo.meonjeo.security.AuthSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.meonjeo.meonjeo.common.OrderStatus;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ShipmentService {
    private final ShipmentRepository repo;
    private final OrderRepository orderRepo;       // ✅ 주문/소유 검증용
    private final AuthSupport auth;               // ✅ 현재 사용자 ID
    private final SweetTrackerPort sweetTracker;  // 스윗트래커 연동 포트

    // ⬇️ 상태 승급용 랭크(하향 금지)
    private static final java.util.Map<OrderStatus, Integer> ORDER_RANK = java.util.Map.of(
            OrderStatus.PENDING, 0,
            OrderStatus.PAID, 1,
            OrderStatus.READY, 2,
            OrderStatus.IN_TRANSIT, 3,
            OrderStatus.DELIVERED, 4,
            OrderStatus.CONFIRMED, 5
    );

    @Transactional
    public void dispatch(DispatchRequest req) {
        // 1) 주문 존재 확인
        Order order = orderRepo.findById(req.orderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        Long me = auth.currentUserId();

        // 🔸 (변경) “모든 아이템이 내 것” → “하나라도 내 것”
        boolean anyMine = order.getItems().stream()
                .anyMatch(it -> it.getSellerId() != null && it.getSellerId().equals(me));
        if (!anyMine) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN_NOT_OWNER");
        }

        // 3) Shipment upsert
        Shipment s = repo.findByOrderId(req.orderId()).orElse(
                Shipment.builder().orderId(req.orderId()).build()
        );

        // 기존 운송건이 있고 다른 셀러가 잡아둔 경우 방어
        if (s.getSellerId() != null && !s.getSellerId().equals(me)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN_NOT_OWNER");
        }

        s.setSellerId(me);
        s.setCourierCode(req.courierCode());
        s.setTrackingNo(req.trackingNo());
        s.setStatus(ShipmentStatus.READY);
        s.setLastSyncedAt(LocalDateTime.now());
        repo.save(s);

        // ⬇️ 추가: 등록 직후 실시간 상태 동기화 (배송중/완료면 즉시 반영)
        try {
            TrackingResponse tr = sweetTracker.fetch(req.courierCode(), req.trackingNo());
            int level = tr.getCurrentLevel();
            updateStatusFromLevel(s, level);  // Shipment 저장 + deliveredAt 세팅

            // 주문 상태도 바로 승격 (READY / IN_TRANSIT / DELIVERED)
            orderRepo.findById(req.orderId()).ifPresent(o -> {
                OrderStatus next = mapOrderStatus(level);
                if (shouldPromote(o.getStatus(), next)) {
                    o.setStatus(next);
                    // 배송완료면 주문 deliveredAt도 시그널이 있으면 세팅(선택)
                    if (next == OrderStatus.DELIVERED && o.getDeliveredAt() == null) {
                        o.setDeliveredAt(s.getDeliveredAt() != null ? s.getDeliveredAt() : LocalDateTime.now());
                    }
                    orderRepo.save(o);
                }
            });
        } catch (Exception ignore) {
            // 트래킹 실패는 무시(스케줄러가 추후 재동기화)
        }
    }

    private boolean shouldPromote(OrderStatus cur, OrderStatus next) {
        if (cur == null) return true;
        if (cur == OrderStatus.CONFIRMED) return false;
        int c = ORDER_RANK.getOrDefault(cur, 0);
        int n = ORDER_RANK.getOrDefault(next, 0);
        return n > c;
    }
    private OrderStatus mapOrderStatus(int lv) {
        if (lv <= 2) return OrderStatus.READY;
        if (lv <= 5) return OrderStatus.IN_TRANSIT;
        return OrderStatus.DELIVERED;
    }

    // ⬇️ readOnly 제거 (상태 업데이트/저장 포함)
    @Transactional
    public TrackingResponse tracking(Long orderId) {
        Shipment s = repo.findByOrderId(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SHIPMENT_NOT_FOUND"));

        // 권한 체크: 주문의 구매자이거나, 주문 아이템 중 내 sellerId가 포함되어야 함
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND"));

        Long me = auth.currentUserId();
        boolean isBuyer = order.getUserId() != null && order.getUserId().equals(me);
        boolean isSellerOfAnyItem = order.getItems().stream()
                .anyMatch(it -> it.getSellerId() != null && it.getSellerId().equals(me));

        if (!(isBuyer || isSellerOfAnyItem)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN_NO_ACCESS");
        }

        TrackingResponse tr = sweetTracker.fetch(s.getCourierCode(), s.getTrackingNo()); // 1~6 단계
        updateStatusFromLevel(s, tr.getCurrentLevel());
        return tr;
    }

    // 내부 호출이므로 @Transactional 없어도 됨(위 tracking이 트랜잭션 범위 보장)
    protected void updateStatusFromLevel(Shipment s, int level) {
        switch (level) {
            case 1 -> s.setStatus(ShipmentStatus.READY);
            case 2, 3, 4, 5 -> s.setStatus(ShipmentStatus.IN_TRANSIT);
            case 6 -> {
                s.setStatus(ShipmentStatus.DELIVERED);
                if (s.getDeliveredAt() == null) {
                    s.setDeliveredAt(LocalDateTime.now());
                }
            }
            default -> { /* ignore */ }
        }
        s.setLastSyncedAt(LocalDateTime.now());
        repo.save(s);
    }

    // ===== 교환용 기존 메서드는 그대로 유지 =====
    @Transactional
    public Long createShipmentForExchange(Long exchangeId, Long userId, Long sellerId,
                                          String carrier, String invoiceNo, int qty,
                                          ShipmentType type) {
        Shipment s = new Shipment();
        // (선택) 엔티티에 userId/sellerId가 있을 때만 세팅
        // s.setUserId(userId);
        s.setSellerId(sellerId);

        s.setCourierCode(carrier);   // 기존 네이밍과 일치
        s.setTrackingNo(invoiceNo);  // 기존 네이밍과 일치
        s.setStatus(ShipmentStatus.READY);
        s.setLastSyncedAt(LocalDateTime.now());

        s.setType(type != null ? type : ShipmentType.EXCHANGE);
        s.setExchangeId(exchangeId);

        repo.save(s);
        return s.getId();
    }

    @Transactional
    public TrackingResponse trackingByExchange(Long exchangeId) {
        Shipment s = repo.findByExchangeId(exchangeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SHIPMENT_NOT_FOUND"));
        TrackingResponse tr = sweetTracker.fetch(s.getCourierCode(), s.getTrackingNo());
        updateStatusFromLevel(s, tr.getCurrentLevel());
        return tr;
    }
}
