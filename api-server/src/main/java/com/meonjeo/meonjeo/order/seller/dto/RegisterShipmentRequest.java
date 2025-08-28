package com.meonjeo.meonjeo.order.seller.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "셀러 송장 등록/수정 요청")
public record RegisterShipmentRequest(
        @Schema(description = "택배사 코드(예: kr.cjlogistics)") String courierCode,
        @Schema(description = "택배사 이름") String courierName,
        @Schema(description = "송장번호") String trackingNo
) {}
