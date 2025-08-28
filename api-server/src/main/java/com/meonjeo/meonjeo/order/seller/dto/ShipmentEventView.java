package com.meonjeo.meonjeo.order.seller.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(description = "배송 이벤트")
public record ShipmentEventView(
        @Schema(description = "상태 코드(원문): 예 1,2,3,4,5,6 또는 원문 상태코드") String statusCode,
        @Schema(description = "상태 텍스트(원문)") String statusText,
        @Schema(description = "발생 위치(지점)") String location,
        @Schema(description = "설명/메시지(원문)") String description,
        @Schema(description = "발생 시각") LocalDateTime occurredAt
) {}
