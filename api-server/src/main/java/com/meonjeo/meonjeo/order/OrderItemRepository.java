package com.meonjeo.meonjeo.order;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    // [NEW] 상세: 특정 주문에서 특정 셀러 아이템만
    List<OrderItem> findByOrderIdAndSellerIdOrderByIdAsc(Long orderId, Long sellerId);

    // [NEW] 목록 페이지 최적화: 여러 주문에 대해 특정 셀러 아이템 한 번에
    @Query("select oi from OrderItem oi where oi.order.id in :orderIds and oi.sellerId = :sellerId")
    List<OrderItem> findByOrderIdInAndSellerId(@Param("orderIds") Collection<Long> orderIds,
                                               @Param("sellerId") Long sellerId);
}
