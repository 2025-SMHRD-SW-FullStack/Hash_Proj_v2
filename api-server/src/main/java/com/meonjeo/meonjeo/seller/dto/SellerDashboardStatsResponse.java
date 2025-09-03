package com.meonjeo.meonjeo.seller.dto;

import java.time.LocalDate;

public record SellerDashboardStatsResponse(
        LocalDate targetDate,
        long newOrders,        // 오늘 날짜 신규 주문 (READY 상태)
        long newFeedbacks,     // 오늘 날짜 신규 피드백
        long shipReady,        // 배송준비 (READY 상태)
        long shipping,         // 배송중 (IN_TRANSIT 상태)
        long shipped,          // 배송완료 (DELIVERED 상태)
        long exchange,         // 교환요청
        long returns,          // 반품요청
        long cancels,          // 취소요청
        long purchaseConfirmed // 구매확정 (CONFIRMED 상태)
) {}
