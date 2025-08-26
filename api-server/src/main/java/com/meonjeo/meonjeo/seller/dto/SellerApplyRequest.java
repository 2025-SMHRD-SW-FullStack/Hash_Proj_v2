package com.meonjeo.meonjeo.seller.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name="SellerApplyRequest", description="셀러 승급 신청 폼")
public record SellerApplyRequest(
        @Schema(example = "123-45-67890") String bizNo,
        @Schema(example = "먼저써봄 상점") String shopName,
        @Schema(example = "홍길동") String ownerName,
        @Schema(example = "서울시 강남구 ...") String addr,
        @Schema(example = "화장품") String category,
        @Schema(example = "02-1234-5678") String phone
) {}
