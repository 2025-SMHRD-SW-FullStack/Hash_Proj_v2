package com.meonjeo.meonjeo.merchant.dto;

import jakarta.validation.constraints.NotBlank;
public record RejectRequest(@NotBlank String reason) {}
