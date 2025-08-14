package com.ressol.ressol.merchant.dto;

import com.ressol.ressol.merchant.CompanyChannel;

public record ChannelDto(
        Long id,
        Long companyId,
        CompanyChannel.Type type,
        String displayName,
        String address,
        String contact,
        String openingHours,
        CompanyChannel.Platform platform,
        String externalId,
        String url,
        boolean active
) {}
