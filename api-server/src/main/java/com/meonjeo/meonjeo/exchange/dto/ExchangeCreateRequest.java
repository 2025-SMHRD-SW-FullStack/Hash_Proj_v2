package com.meonjeo.meonjeo.exchange.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.util.List;

public record ExchangeCreateRequest(
        @Schema(description="교환 수량(기본 1)") @Min(1) int qty,
        @Schema(description="요청 변형 SKU ID(없으면 null)") Long requestedVariantId,
        @Schema(description="사유 텍스트") @Size(max=1000) String reasonText,
        @Schema(description="이미지 URL 배열(최대 5장)") @Size(max=5) List<@NotBlank String> imageUrls
) {}
