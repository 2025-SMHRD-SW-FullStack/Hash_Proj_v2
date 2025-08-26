package com.meonjeo.meonjeo.product.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "ProductVariantResponse")
public record ProductVariantResponse(
        Long id,
        String option1Value, String option2Value, String option3Value, String option4Value, String option5Value,
        int addPrice, int stock, String skuCode
) {}
