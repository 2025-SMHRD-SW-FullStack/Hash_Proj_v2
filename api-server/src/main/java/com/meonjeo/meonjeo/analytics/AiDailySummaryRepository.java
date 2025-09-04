package com.meonjeo.meonjeo.analytics;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

public interface AiDailySummaryRepository extends JpaRepository<AiDailySummary, Long> {

    Optional<AiDailySummary> findByProductIdAndSummaryDate(Long productId, LocalDate date);

    @Query("""
      select a from AiDailySummary a
      where a.productId = :productId
        and (:fromDate is null or a.summaryDate >= :fromDate)
        and (:toDate   is null or a.summaryDate <= :toDate)
      order by a.summaryDate desc
    """)
    List<AiDailySummary> findRange(
            @Param("productId") Long productId,
            @Param("fromDate") LocalDate from, @Param("toDate") LocalDate to);

    @Query("""
      select max(a.createdAt) from AiDailySummary a
      where a.productId = :productId
    """)
    LocalDateTime findLastGeneratedAt(@Param("productId") Long productId);
}
