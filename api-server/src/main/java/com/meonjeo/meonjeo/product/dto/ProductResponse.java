package com.meonjeo.meonjeo.product.dto;

import java.time.LocalDateTime;

public record ProductResponse(
        Long id, String name, String brand, int basePrice, int salePrice,
        String category, String thumbnailUrl, String detailHtml,
        int stockTotal, int feedbackPoint,
        LocalDateTime saleStartAt, LocalDateTime saleEndAt,
        String option1Name, String option2Name, String option3Name, String option4Name, String option5Name
) {}
