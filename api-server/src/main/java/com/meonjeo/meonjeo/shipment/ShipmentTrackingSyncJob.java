package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.common.ShipmentStatus;
import com.meonjeo.meonjeo.order.OrderRepository;
import com.meonjeo.meonjeo.shipment.dto.TrackingResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class ShipmentTrackingSyncJob {

    private final ShipmentRepository shipmentRepo;
    private final OrderRepository orderRepo;
    private final TrackingService trackingService; // 이미 있는 서비스 재사용

    // 상태 상승만 허용하기 위한 랭크 맵 (⚠ CANCELED 제거: enum에 없을 수 있음)
    private static final Map<OrderStatus, Integer> ORDER_RANK = new EnumMap<>(OrderStatus.class);
    static {
        ORDER_RANK.put(OrderStatus.PENDING,    0);
        ORDER_RANK.put(OrderStatus.PAID,       1);
        ORDER_RANK.put(OrderStatus.READY,      2);
        ORDER_RANK.put(OrderStatus.IN_TRANSIT, 3);
        ORDER_RANK.put(OrderStatus.DELIVERED,  4);
        ORDER_RANK.put(OrderStatus.CONFIRMED,  5);
    }

    /** 5분마다 추적 동기화 (서버 시간대 기준). @EnableScheduling 이미 활성화되어 있으면 그대로 동작 */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void syncTracking() {
        List<Shipment> targets =
                shipmentRepo.findAllByCourierCodeIsNotNullAndTrackingNoIsNotNullAndStatusNot(ShipmentStatus.DELIVERED);
        if (targets.isEmpty()) return;

        int touched = 0, delivered = 0;

        for (Shipment sh : targets) {
            try {
                TrackingResult tr = trackingService.track(sh.getCourierCode(), sh.getTrackingNo());
                int level = extractLevel(tr); // 리플렉션 기반 안전 추출

                // 주문 상태 올리기
                orderRepo.findById(sh.getOrderId()).ifPresent(o -> {
                    OrderStatus next = mapOrderStatus(level);
                    if (shouldPromote(o.getStatus(), next)) {
                        o.setStatus(next);
                        // 구매확정은 D+7 배치에서 처리, 여기선 배송완료까지만
                        orderRepo.save(o);
                    }
                });

                // 배송 엔티티 갱신
                if (level >= 6) {
                    sh.setStatus(ShipmentStatus.DELIVERED);
                    if (sh.getDeliveredAt() == null) sh.setDeliveredAt(LocalDateTime.now());
                    delivered++;
                } else {
                    // 필요 시: 중간 단계 표시 원하면 아래 한 줄 주석 해제
                    // sh.setStatus(ShipmentStatus.IN_TRANSIT);
                }
                sh.setLastSyncedAt(LocalDateTime.now());
                shipmentRepo.save(sh);
                touched++;

            } catch (Exception e) {
                log.warn("Tracking sync failed for shipment id={}, track={} {}: {}",
                        sh.getId(), sh.getCourierCode(), sh.getTrackingNo(), e.toString());
            }
        }

        if (touched > 0) {
            log.info("Tracking sync done. updated={}, deliveredMarked={}", touched, delivered);
        }
    }

    private boolean shouldPromote(OrderStatus cur, OrderStatus next) {
        if (cur == null) return true;
        // 이미 CONFIRMED면 더 이상 올리지 않음
        if (cur == OrderStatus.CONFIRMED) return false;

        Integer c = ORDER_RANK.getOrDefault(cur, 0);
        Integer n = ORDER_RANK.getOrDefault(next, 0);
        return n > c;
    }

    private OrderStatus mapOrderStatus(int level) {
        // 1:배송준비중, 2:집화완료 → READY
        // 3~5:배송중/허브/출발 → IN_TRANSIT
        // 6:배송 완료 → DELIVERED
        if (level <= 2) return OrderStatus.READY;
        if (level <= 5) return OrderStatus.IN_TRANSIT;
        return OrderStatus.DELIVERED;
    }

    /** 리플렉션으로 level/currentLevel/getLevel/getCurrentLevel 중 있는 것을 호출 */
    private int extractLevel(TrackingResult tr) {
        // 후보 메서드명들
        String[] candidates = {"level", "currentLevel", "getLevel", "getCurrentLevel"};
        for (String name : candidates) {
            try {
                Method m = tr.getClass().getMethod(name);
                Object v = m.invoke(tr);
                if (v instanceof Number num) return num.intValue();
                if (v != null) return Integer.parseInt(String.valueOf(v));
            } catch (Exception ignore) {}
        }
        // 전혀 없으면 '배송중'으로 간주
        return 3;
    }
}
