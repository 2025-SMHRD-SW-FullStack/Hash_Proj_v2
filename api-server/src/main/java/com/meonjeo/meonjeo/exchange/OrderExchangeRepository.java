package com.meonjeo.meonjeo.exchange;

import com.meonjeo.meonjeo.exchange.ExchangeStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderExchangeRepository extends JpaRepository<OrderExchange, Long> {
    List<OrderExchange> findByUserIdOrderByIdDesc(Long userId);
    List<OrderExchange> findBySellerIdAndStatusOrderByIdDesc(Long sellerId, ExchangeStatus status);
    boolean existsByOrderItemIdAndStatusIn(Long orderItemId, List<ExchangeStatus> statuses);
    Optional<OrderExchange> findByIdAndUserId(Long id, Long userId);
    Optional<OrderExchange> findByIdAndSellerId(Long id, Long sellerId);

}
