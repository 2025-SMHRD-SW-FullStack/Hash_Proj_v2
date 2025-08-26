package com.meonjeo.meonjeo.shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    Optional<Shipment> findByOrderId(Long orderId);
}
