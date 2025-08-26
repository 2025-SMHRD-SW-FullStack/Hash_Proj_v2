package com.meonjeo.meonjeo.point;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface PointLedgerRepository extends JpaRepository<PointLedgerEntry, Long> {

    @Query("select coalesce(sum(p.amount),0) from PointLedgerEntry p where p.userId = :uid")
    int sumBalance(@Param("uid") Long userId);

    boolean existsByUserIdAndReasonAndRefKey(Long userId, String reason, String refKey);

    Page<PointLedgerEntry> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);

    Page<PointLedgerEntry> findByUserIdAndReasonOrderByIdDesc(Long userId, String reason, Pageable pageable);
}
