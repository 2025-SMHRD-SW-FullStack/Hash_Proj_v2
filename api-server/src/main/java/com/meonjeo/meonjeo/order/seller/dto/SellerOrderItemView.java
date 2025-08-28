package com.meonjeo.meonjeo.order.seller.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "셀러 주문 아이템 뷰")
public record SellerOrderItemView(
        @Schema(description = "아이템 ID") Long id,
        @Schema(description = "상품 ID") Long productId,
        @Schema(description = "상품명(스냅샷)") String productName,
        @Schema(description = "단가(원)") int unitPrice,
        @Schema(description = "수량") int qty,
        @Schema(description = "선택 옵션 스냅샷(JSON)") String optionSnapshotJson
) {}
