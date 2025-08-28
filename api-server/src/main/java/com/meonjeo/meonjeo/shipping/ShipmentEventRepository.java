package com.meonjeo.meonjeo.shipping;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ShipmentEventRepository extends JpaRepository<ShipmentEvent, Long> {
    List<ShipmentEvent> findByOrderIdOrderByOccurredAtAsc(Long orderId);

    // [NEW] 여러 송장 중 최신 이벤트 1건
    @Query("""
      select e from ShipmentEvent e
      where e.orderId = :orderId
        and (coalesce(e.trackingNo,'') in :trackingNos)
      order by e.occurredAt desc
    """)
    List<ShipmentEvent> findLatestOneForOrderAndTrackingNos(Long orderId, Collection<String> trackingNos);

    // ✅ 최신 이벤트 1건 (occurredAt desc, id desc)
    Optional<ShipmentEvent> findTop1ByOrderIdOrderByOccurredAtDescIdDesc(Long orderId);

    // ✅ 트래킹별 최신 판단을 위해 주문 단위 내림차순 조회
    List<ShipmentEvent> findByOrderIdOrderByOccurredAtDesc(Long orderId);

    // ✅ 특정 주문+송장에 대한 최신 이벤트를 얻기 위한 정렬 버전
    List<ShipmentEvent> findByOrderIdAndTrackingNoOrderByOccurredAtDesc(Long orderId, String trackingNo);
}
