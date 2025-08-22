package com.meonjeo.meonjeo.merchant.dto;

public record RegionChannelResponse(
        Long id,
        Long companyId,
        String name,
        String address,
        Double latitude,
        Double longitude,
        String sido,
        String sigungu,
        String dong
) {}
