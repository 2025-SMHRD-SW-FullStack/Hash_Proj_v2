package com.meonjeo.meonjeo.order.seller.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "배송 타임라인(한 송장 단위)")
public record ShippingTimelineView(
        @Schema(description = "택배사 코드(예: kr.cjlogistics)") String courierCode,
        @Schema(description = "택배사 이름(예: CJ대한통운)") String courierName,
        @Schema(description = "운송장 번호") String trackingNo,
        @Schema(description = "이벤트 목록(오름차순)") List<ShipmentEventView> events
) {}
