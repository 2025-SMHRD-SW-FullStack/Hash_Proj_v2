package com.meonjeo.meonjeo.shipping;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderShipmentRepository extends JpaRepository<OrderShipment, Long> {
    List<OrderShipment> findByOrderIdInAndSellerId(Collection<Long> orderIds, Long sellerId);
    List<OrderShipment> findByOrderIdAndSellerId(Long orderId, Long sellerId);
    Optional<OrderShipment> findTopByOrderIdAndSellerIdOrderByIdDesc(Long orderId, Long sellerId);
    List<OrderShipment> findByOrderId(Long orderId);

}
