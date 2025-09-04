package com.meonjeo.meonjeo.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    // (기존 메소드)
    Optional<OrderItem> findByIdAndOrderUserId(Long orderItemId, Long userId);

    /**
     * ID 목록으로 OrderItem을 조회할 때, 각 아이템의 Order 엔티티와
     * 그 Order에 속한 모든 Item 목록까지 한번에 가져오는 메소드 (피드백 목록 N+1 문제 해결용)
     */
    @Query("SELECT oi FROM OrderItem oi " +
            "LEFT JOIN FETCH oi.order o " +
            "LEFT JOIN FETCH o.items " +
            "WHERE oi.id IN :ids")
    List<OrderItem> findAllByIdWithDetails(@Param("ids") List<Long> ids);

    /**
     * SellerOrderService의 컴파일 오류 해결을 위한 메소드.
     * 여러 주문 ID와 셀러 ID를 기반으로 관련된 모든 주문 상품을 조회합니다.
     */
    @Query("SELECT oi FROM OrderItem oi WHERE oi.order.id IN :orderIds AND oi.sellerId = :sellerId")
    List<OrderItem> findByOrderIdInAndSellerId(@Param("orderIds") List<Long> orderIds, @Param("sellerId") Long sellerId);

    // ===== ✅ 실시간 스냅샷용: 금일 특정 상품의 구매건수/매출합 =====

    @Query("""
        select count(oi)
          from OrderItem oi
          join oi.order o
         where oi.productId = :productId
           and o.status in ('READY','IN_TRANSIT','DELIVERED','CONFIRMED')
           and o.createdAt >= :fromTs
    """)
    long countPaidOrdersForProductSince(@Param("productId") Long productId,
                                        @Param("fromTs") LocalDateTime fromTs);

    @Query("""
        select coalesce(sum(oi.unitPrice * oi.qty), 0)
          from OrderItem oi
          join oi.order o
         where oi.productId = :productId
           and o.status in ('READY','IN_TRANSIT','DELIVERED','CONFIRMED')
           and o.createdAt >= :fromTs
    """)
    Long sumSalesAmountForProductSince(@Param("productId") Long productId,
                                       @Param("fromTs") LocalDateTime fromTs);
}
