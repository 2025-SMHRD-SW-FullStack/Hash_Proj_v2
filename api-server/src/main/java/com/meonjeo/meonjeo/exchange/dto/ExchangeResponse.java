package com.meonjeo.meonjeo.exchange.dto;

import java.util.List;

public record ExchangeResponse(
        Long id, Long orderItemId, Long productId,
        Long originalVariantId, Long requestedVariantId, Long approvedVariantId,
        int qty, String status, String reasonText, String rejectReason,
        List<String> photos, String windowEndsAt,
        Long replacementShipmentId, String createdAt,

        // ↓↓↓ 여기부터 추가 (nullable 허용)
        Long orderId,
        String orderUid,
        String receiver,     // Order.receiver
        String phone,        // Order.phone
        String addr1,        // Order.addr1
        String addr2,        // Order.addr2
        String zipcode,      // Order.zipcode
        String requestMemo,  // Order.requestMemo (= 배송요청사항)
        String productName   // Product.name

) {}