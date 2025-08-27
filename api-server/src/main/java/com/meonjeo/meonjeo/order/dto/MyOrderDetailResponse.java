package com.meonjeo.meonjeo.order.dto;

import com.meonjeo.meonjeo.common.OrderStatus;

import java.time.LocalDateTime;
import java.util.List;

public record MyOrderDetailResponse(
        Long id,
        String orderUid,
        OrderStatus status,
        int totalPrice,
        int usedPoint,
        int payAmount,
        String receiver,
        String phone,
        String addr1,
        String addr2,
        String zipcode,
        String requestMemo,
        LocalDateTime createdAt,
        LocalDateTime confirmedAt,
        List<MyOrderItemView> items
) {}
