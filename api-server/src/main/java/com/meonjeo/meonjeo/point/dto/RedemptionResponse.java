package com.meonjeo.meonjeo.point.dto;

import java.time.LocalDateTime;

public record RedemptionResponse(
        Long id,Long userId , int amount, RedemptionStatus status, LocalDateTime createdAt, LocalDateTime processedAt
) {}