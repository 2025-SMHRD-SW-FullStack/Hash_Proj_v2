package com.meonjeo.meonjeo.order;

import com.meonjeo.meonjeo.common.OrderStatus;
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

    // [ADD] D+7 자동확정 대상
    @Query("""
        select o from Order o
        where o.status = :delivered
          and o.deliveredAt <= :threshold
          and o.confirmedAt is null
    """)
    List<Order> findAutoConfirmTargets(@Param("delivered") OrderStatus delivered,
                                       @Param("threshold") LocalDateTime threshold);
}
