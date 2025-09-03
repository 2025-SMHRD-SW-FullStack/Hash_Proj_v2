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

    // ====== [NEW] 셀러 대시보드 통계용 카운트 메서드들 ======
    
    // 셀러의 특정 상태 교환 개수
    long countBySellerIdAndStatus(Long sellerId, ExchangeStatus status);
    
    // 셀러의 특정 날짜 범위에 생성된 교환 개수
    long countBySellerIdAndCreatedAtBetween(Long sellerId, java.time.LocalDateTime fromTs, java.time.LocalDateTime toTs);
    
    // 셀러의 전체 교환 개수 (특정 상태)
    long countBySellerIdAndStatusIn(Long sellerId, java.util.List<ExchangeStatus> statuses);
}
