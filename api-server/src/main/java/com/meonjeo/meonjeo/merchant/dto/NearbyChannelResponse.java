package com.meonjeo.meonjeo.merchant.dto;

public record NearbyChannelResponse(
        Long id,
        Long companyId,
        String name,
        String address,
        Double latitude,
        Double longitude,
        Double distanceKm
) {}
