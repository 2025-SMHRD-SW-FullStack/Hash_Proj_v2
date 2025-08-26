package com.meonjeo.meonjeo.point.dto;

import jakarta.validation.constraints.Positive;

public record RedemptionCreateRequest(@Positive int amount) {}