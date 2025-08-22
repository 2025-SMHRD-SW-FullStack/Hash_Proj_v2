package com.meonjeo.meonjeo.proof;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductOrderRegRepository extends JpaRepository<ProductOrderReg, Long> {
    Optional<ProductOrderReg> findByApplicationId(Long applicationId);
}
