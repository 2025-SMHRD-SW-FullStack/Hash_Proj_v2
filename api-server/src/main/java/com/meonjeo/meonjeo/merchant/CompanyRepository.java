package com.meonjeo.meonjeo.merchant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {

    Page<Company> findByStatus(Company.Status status, Pageable pageable);
    Page<Company> findAll(Pageable pageable);
    Optional<Company> findByIdAndOwnerId(Long id, Long ownerId);
    Optional<Company> findFirstByOwnerIdAndStatusOrderByIdDesc(Long ownerId, Company.Status status);
    boolean existsByOwnerIdAndStatus(Long ownerId, Company.Status status);
}
