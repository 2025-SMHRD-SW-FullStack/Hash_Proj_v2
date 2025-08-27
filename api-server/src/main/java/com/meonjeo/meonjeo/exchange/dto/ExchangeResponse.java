package com.meonjeo.meonjeo.exchange.dto;

import java.util.List;

public record ExchangeResponse(
        Long id, Long orderItemId, Long productId,
        Long originalVariantId, Long requestedVariantId, Long approvedVariantId,
        int qty, String status, String reasonText, String rejectReason,
        List<String> photos, String windowEndsAt,
        Long replacementShipmentId, String createdAt
) {}