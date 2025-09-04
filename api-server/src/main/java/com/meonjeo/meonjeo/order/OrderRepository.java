package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderUid(String orderUid);
    List<Order> findByUserIdOrderByIdDesc(Long userId);
    Optional<Order> findByIdAndUserId(Long id, Long userId);

    @Query("select distinct o from Order o left join fetch o.items where o.id=:id and o.userId=:uid")
    Optional<Order> findDetailForUser(@Param("id") Long id, @Param("uid") Long userId);

    // [CHG] 자동확정 후보: 배송완료 상태 + 아직 미확정
    @Query("""
        select o from Order o
        where o.status = :delivered
          and o.confirmedAt is null
    """)
    List<Order> findDeliveredUnconfirmed(@Param("delivered") OrderStatus delivered);

    // ====== [NEW] 셀러 주문 목록 검색 (주문 헤더 페이징) ======
    @Query(value = """
        select distinct o
        from Order o
        join o.items oi
        where oi.sellerId = :sellerId
          and (:status is null or o.status = :status)
          and (:fromTs is null or o.createdAt >= :fromTs)
          and (:toTs   is null or o.createdAt <  :toTs)
          and ( :q is null or :q = '' 
                or o.orderUid like concat('%', :q, '%')
                or o.receiver like concat('%', :q, '%')
                or o.phone    like concat('%', :q, '%')
          )
        """,
            countQuery = """
        select count(distinct o.id)
        from Order o
        join o.items oi
        where oi.sellerId = :sellerId
          and (:status is null or o.status = :status)
          and (:fromTs is null or o.createdAt >= :fromTs)
          and (:toTs   is null or o.createdAt <  :toTs)
          and ( :q is null or :q = '' 
                or o.orderUid like concat('%', :q, '%')
                or o.receiver like concat('%', :q, '%')
                or o.phone    like concat('%', :q, '%')
          )
        """
    )
    Page<Order> searchForSeller(
            @Param("sellerId") Long sellerId,
            @Param("status") OrderStatus status,
            @Param("fromTs") LocalDateTime fromTs,
            @Param("toTs") LocalDateTime toTs,
            @Param("q") String q,
            Pageable pageable
    );

    // ====== [NEW] 해당 셀러 소유 아이템 존재 여부 ======
    @Query("""
        select (count(oi) > 0)
        from OrderItem oi
        where oi.order.id = :orderId
          and oi.sellerId = :sellerId
    """)
    boolean existsForSeller(@Param("orderId") Long orderId, @Param("sellerId") Long sellerId);

    @Query("""
        select distinct o
        from Order o
        join fetch o.items oi
        where oi.sellerId = :sellerId
          and o.confirmedAt is not null
          and o.confirmedAt >= :fromTs
          and o.confirmedAt <  :toTs
    """)
    List<Order> findConfirmedOrdersForSeller(
            @Param("sellerId") Long sellerId,
            @Param("fromTs") java.time.LocalDateTime fromTs,
            @Param("toTs")   java.time.LocalDateTime toTs
    );

    // ====== [NEW] 셀러 대시보드 통계용 카운트 메서드들 ======
    
    // 특정 날짜 범위의 셀러 주문 개수 (특정 상태)
    @Query("""
        select count(distinct o.id)
        from Order o
        join o.items oi
        where oi.sellerId = :sellerId
          and o.status = :status
          and o.createdAt >= :fromTs
          and o.createdAt < :toTs
    """)
    long countSellerOrdersByStatusAndDate(
            @Param("sellerId") Long sellerId,
            @Param("status") OrderStatus status,
            @Param("fromTs") LocalDateTime fromTs,
            @Param("toTs") LocalDateTime toTs
    );
    
    // 셀러의 전체 주문 개수 (특정 상태)
    @Query("""
        select count(distinct o.id)
        from Order o
        join o.items oi
        where oi.sellerId = :sellerId
          and o.status = :status
    """)
    long countSellerOrdersByStatus(
            @Param("sellerId") Long sellerId,
            @Param("status") OrderStatus status
    );

    // 아래 메서드 추가
    @Query("""
      select distinct o from Order o
      join o.items oi
      where oi.productId = :productId
        and o.confirmedAt is not null
        and o.confirmedAt >= :fromTs
        and o.confirmedAt <  :toTs
    """)
    List<Order> findConfirmedOrdersForProduct(
            @Param("productId") Long productId,
            @Param("fromTs") java.time.LocalDateTime fromTs,
            @Param("toTs")   java.time.LocalDateTime toTs
    );


}
