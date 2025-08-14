package com.ressol.ressol.merchant.dto;

import com.ressol.ressol.merchant.CompanyChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ChannelUpsertRequest(
        @NotNull CompanyChannel.Type type,
        @NotBlank String displayName,
        // OFFLINE
        String address,
        String contact,
        String openingHours,
        // ONLINE
        CompanyChannel.Platform platform, // ONLINE이면 필수 (서비스에서 검증)
        String externalId,
        String url,
        // 상태
        Boolean active // null이면 true로
) {}
