package com.meonjeo.meonjeo.point.dto;

import java.time.LocalDateTime;

public record AdminRedemptionItem(
        Long id,
        Long userId,
        String nickname,
        int amount,
        RedemptionStatus status,
        LocalDateTime createdAt,
        LocalDateTime processedAt
) {}
