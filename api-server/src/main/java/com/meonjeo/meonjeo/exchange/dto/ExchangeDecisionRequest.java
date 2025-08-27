package com.meonjeo.meonjeo.exchange.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record ExchangeDecisionRequest(
        @Schema(description="승인 시 지정할 최종 변형 SKU ID(없으면 원래 SKU)") Long approvedVariantId,
        @Schema(description="반려 사유(반려시 필수)") @Size(max=500) String reason
) {}