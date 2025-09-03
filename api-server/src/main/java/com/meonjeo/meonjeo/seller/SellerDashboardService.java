package com.meonjeo.meonjeo.seller;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.exchange.ExchangeStatus;
import com.meonjeo.meonjeo.exchange.OrderExchangeRepository;
import com.meonjeo.meonjeo.feedback.FeedbackRepository;
import com.meonjeo.meonjeo.order.OrderRepository;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.seller.dto.SellerDashboardStatsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SellerDashboardService {

    private final OrderRepository orderRepo;
    private final FeedbackRepository feedbackRepo;
    private final OrderExchangeRepository exchangeRepo;
    private final AuthSupport auth;

    public SellerDashboardStatsResponse getDashboardStats(LocalDate targetDate) {
        Long sellerId = auth.currentUserId();
        LocalDateTime dayStart = targetDate.atStartOfDay();
        LocalDateTime dayEnd = targetDate.plusDays(1).atStartOfDay();

        // 오늘 날짜 신규 주문 (READY 상태)
        long newOrders = orderRepo.countSellerOrdersByStatusAndDate(sellerId, OrderStatus.READY, dayStart, dayEnd);
        
        // 오늘 날짜 신규 피드백
        long newFeedbacks = feedbackRepo.countSellerFeedbacksByDate(sellerId, dayStart, dayEnd);
        
        // 전체 상태별 주문 통계 (모든 날짜)
        long shipReady = orderRepo.countSellerOrdersByStatus(sellerId, OrderStatus.READY);
        long shipping = orderRepo.countSellerOrdersByStatus(sellerId, OrderStatus.IN_TRANSIT);
        long shipped = orderRepo.countSellerOrdersByStatus(sellerId, OrderStatus.DELIVERED);
        long purchaseConfirmed = orderRepo.countSellerOrdersByStatus(sellerId, OrderStatus.CONFIRMED);
        
        // 교환요청 (현재 구현되지 않음)
        long exchange = 0;
        
        // 반품/취소는 현재 구현되지 않음 (추후 구현 시 추가)
        long returns = 0;
        long cancels = 0;

        return new SellerDashboardStatsResponse(
                targetDate,
                newOrders,
                newFeedbacks,
                shipReady,
                shipping,
                shipped,
                exchange,
                returns,
                cancels,
                purchaseConfirmed
        );
    }
}
