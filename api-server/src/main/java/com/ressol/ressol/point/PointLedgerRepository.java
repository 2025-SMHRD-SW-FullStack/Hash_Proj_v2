package com.ressol.ressol.point;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface PointLedgerRepository extends JpaRepository<PointLedger, Long> {

    Optional<PointLedger> findByUserIdAndTypeAndRelatedId(Long userId, PointType type, Long relatedId);

    @Query("select coalesce(sum(p.amount), 0) from PointLedger p " +
            "where p.userId = :userId and p.status = com.ressol.ressol.point.PointStatus.APPROVED")
    long sumApprovedByUserId(Long userId);
}
