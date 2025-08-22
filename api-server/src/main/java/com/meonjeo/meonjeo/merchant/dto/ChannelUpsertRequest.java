// src/main/java/com/ressol/ressol/merchant/dto/ChannelUpsertRequest.java
package com.meonjeo.meonjeo.merchant.dto;

import com.meonjeo.meonjeo.merchant.CompanyChannel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(
        name = "ChannelUpsertRequest",
        description = """
    채널 생성/수정 요청 바디.
    - OFFLINE = 오프라인 지점(주소/연락처/영업시간 사용)
    - ONLINE  = 온라인 스토어(플랫폼/URL 사용)
    - active가 null이면 서버에서 true로 처리됩니다.
    """
)
public record ChannelUpsertRequest(

        @NotNull
        @Schema(description = "채널 타입 (OFFLINE=오프라인 지점, ONLINE=온라인 스토어)", example = "OFFLINE")
        CompanyChannel.Type type,

        @NotBlank
        @Schema(description = "노출명(지점명/스토어명)", example = "리쏠 홍대점")
        String displayName,

        // OFFLINE 전용
        @Schema(description = "(OFFLINE) 지점 주소", example = "서울특별시 마포구 양화로 123, 3층")
        String address,

        @Schema(description = "(OFFLINE) 연락처", example = "02-1234-5678")
        String contact,

        @Schema(description = "(OFFLINE) 영업시간", example = "매일 11:00~22:00")
        String openingHours,

        // ONLINE 전용
        @Schema(description = "(ONLINE) 플랫폼 (예: NAVER, COUPANG, ELEVENST, ETC)", example = "NAVER")
        CompanyChannel.Platform platform, // ONLINE이면 필수 (서비스에서 검증)

        @Schema(description = "(ONLINE) 외부 스토어 ID(선택)", example = "store_12345")
        String externalId,

        @Schema(description = "(ONLINE) 스토어 URL", example = "https://smartstore.naver.com/ressol")
        String url,

        // 상태
        @Schema(description = "활성 여부(null이면 true로 처리)", example = "true")
        Boolean active
) {}
