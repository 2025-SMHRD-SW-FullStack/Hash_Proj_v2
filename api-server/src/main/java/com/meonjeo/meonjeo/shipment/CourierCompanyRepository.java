package com.meonjeo.meonjeo.shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface CourierCompanyRepository extends JpaRepository<CourierCompany, Long> {
    Optional<CourierCompany> findByCode(String code);
}
