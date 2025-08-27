package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.common.ShipmentStatus;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findByOrderId(Long orderId);

    List<Shipment> findAllByStatusAndDeliveredAtBefore(ShipmentStatus status, LocalDateTime threshold);
    List<Shipment> findAllByCourierCodeIsNotNullAndTrackingNoIsNotNullAndStatusNot(ShipmentStatus status);

    Optional<Shipment> findByExchangeId(Long exchangeId);

    // [ADD] 남은 미배송 카운트
    @Query("select count(s) from Shipment s where s.orderId=:orderId and s.deliveredAt is null")
    long countByOrderIdAndDeliveredAtIsNull(@Param("orderId") Long orderId);

    // [ADD] 해당 주문의 배송완료 시각 중 최댓값
    @Query("select max(s.deliveredAt) from Shipment s where s.orderId=:orderId")
    LocalDateTime maxDeliveredAtByOrderId(@Param("orderId") Long orderId);

    // [편의] 한 주문의 모든 출고
    List<Shipment> findAllByOrderId(Long orderId);
}
