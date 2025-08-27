package com.meonjeo.meonjeo.order.dto;

public record MyOrderItemView(
        Long id,
        Long productId,
        String productName,
        int unitPrice,
        int qty,
        String optionSnapshotJson
) {}
