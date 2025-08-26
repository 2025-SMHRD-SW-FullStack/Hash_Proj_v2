package com.meonjeo.meonjeo.product.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(name="ProductWithVariantsResponse")
public record ProductWithVariantsResponse(ProductResponse product, List<ProductVariantResponse> variants) {}
