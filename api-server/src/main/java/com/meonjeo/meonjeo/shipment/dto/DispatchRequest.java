package com.meonjeo.meonjeo.shipment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DispatchRequest(
        @NotNull Long orderId,
        @NotBlank String courierCode,
        @NotBlank String trackingNo
) {}