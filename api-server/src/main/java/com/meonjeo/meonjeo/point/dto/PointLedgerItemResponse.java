package com.meonjeo.meonjeo.point.dto;

import java.time.LocalDateTime;

public record PointLedgerItemResponse(
        Long id, int amount, String reason, String refKey, LocalDateTime createdAt
) {}