package com.meonjeo.meonjeo.order.dto;

import java.time.LocalDateTime;

public record OrderWindowResponse(
        LocalDateTime effectiveDeliveredAt,
        LocalDateTime deadlineAt,
        LocalDateTime now,
        boolean open,
        Long remainingSeconds
) {}
