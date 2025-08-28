package com.meonjeo.meonjeo.feedback;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    Optional<Feedback> findByOrderItemIdAndUserId(Long orderItemId, Long userId);
    boolean existsByOrderItemIdAndUserId(Long orderItemId, Long userId);

    // 셀러 통계용: productId + 기간으로 피드백 조회 (삭제된 건 제외)
    @Query("""
        select f from Feedback f, OrderItem oi
        where oi.id = f.orderItemId
          and oi.productId = :productId
          and (f.removed = false or f.removed is null)
          and (:from is null or f.createdAt >= :from)
          and (:to is null or f.createdAt < :to)
    """)
    List<Feedback> findForProductAndPeriod(
            @Param("productId") Long productId,
            @Param("from") LocalDateTime fromInclusive,
            @Param("to") LocalDateTime toExclusive
    );
}
