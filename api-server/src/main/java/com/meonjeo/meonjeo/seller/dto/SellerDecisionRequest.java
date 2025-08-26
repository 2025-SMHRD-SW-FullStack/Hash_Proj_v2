package com.meonjeo.meonjeo.seller.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name="SellerDecisionRequest")
public record SellerDecisionRequest(
        @Schema(example = "보완서류 확인됨. 승인합니다.") String memo // 거절 사유/메모 공용
) {}
