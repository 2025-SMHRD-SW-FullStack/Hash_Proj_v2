package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

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
}
