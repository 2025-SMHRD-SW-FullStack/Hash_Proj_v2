package com.meonjeo.meonjeo.order.dto;

import com.meonjeo.meonjeo.common.OrderStatus;

import java.time.LocalDateTime;

public record MyOrderSummaryResponse(
        Long id,
        String orderUid,
        OrderStatus status,
        int totalPrice,
        int usedPoint,
        int payAmount,
        LocalDateTime createdAt
) {}
