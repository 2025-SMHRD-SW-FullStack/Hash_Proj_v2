package com.meonjeo.meonjeo.feedback;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    Optional<Feedback> findByOrderItemIdAndUserId(Long orderItemId, Long userId);
    boolean existsByOrderItemIdAndUserId(Long orderItemId, Long userId);

    // ✅ 상품 기준 1회 제한 (스키마 변경 없이 조인으로 검사)
    @Query("""
        select (count(f) > 0) from Feedback f
          join OrderItem oi on oi.id = f.orderItemId
        where f.userId = :userId
          and oi.productId = :productId
          and (f.removed = false or f.removed is null)
    """)
    boolean existsForUserAndProduct(@Param("userId") Long userId,
                                    @Param("productId") Long productId);

    // ✅ 내 피드백 목록
    Page<Feedback> findByUserIdAndRemovedFalseOrderByIdDesc(Long userId, Pageable pageable);

    // ✅ 상품 피드백 목록 (조인 + 페이지네이션)
    @Query(
            value = """
        select f from Feedback f
          join OrderItem oi on oi.id = f.orderItemId
        where oi.productId = :productId
          and (f.removed = false or f.removed is null)
        order by f.id desc
      """,
            countQuery = """
        select count(f) from Feedback f
          join OrderItem oi on oi.id = f.orderItemId
        where oi.productId = :productId
          and (f.removed = false or f.removed is null)
      """
    )
    Page<Feedback> pageByProduct(@Param("productId") Long productId, Pageable pageable);

    // ===== (네가 주신 기존 메서드들 유지) =====

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

    @Query("""
        select distinct f.orderItemId
        from Feedback f, OrderItem oi
        where oi.id = f.orderItemId
          and oi.order.id = :orderId
          and (f.removed = false or f.removed is null)
    """)
    List<Long> findItemIdsWithFeedbackByOrderId(@Param("orderId") Long orderId);

    @Query("""
        select (count(f) > 0)
        from Feedback f, OrderItem oi
        where oi.id = f.orderItemId
          and oi.order.id = :orderId
          and (f.removed = false or f.removed is null)
    """)
    boolean existsForOrder(@Param("orderId") Long orderId);

    // ====== [NEW] 셀러 대시보드 통계용 카운트 메서드 ======
    
    // 특정 날짜 범위에 생성된 셀러의 피드백 개수
    @Query("""
        select count(f)
        from Feedback f
        join OrderItem oi on oi.id = f.orderItemId
        where oi.sellerId = :sellerId
          and (f.removed = false or f.removed is null)
          and f.createdAt >= :fromTs
          and f.createdAt < :toTs
    """)
    long countSellerFeedbacksByDate(
            @Param("sellerId") Long sellerId,
            @Param("fromTs") LocalDateTime fromTs,
            @Param("toTs") LocalDateTime toTs
    );
    @Query(
        value = """
            select f
            from Feedback f, OrderItem oi
            where oi.id = f.orderItemId
              and oi.sellerId = :sellerId
              and (f.removed = false or f.removed is null)
            order by f.id desc
        """,
                countQuery = """
            select count(f)
            from Feedback f, OrderItem oi
            where oi.id = f.orderItemId
              and oi.sellerId = :sellerId
              and (f.removed = false or f.removed is null)
        """
        )
    Page<Feedback> pageBySeller(@Param("sellerId") Long sellerId, Pageable pageable);
}
