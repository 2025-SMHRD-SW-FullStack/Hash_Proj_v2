package com.ressol.ressol.mission.dto;

import com.ressol.ressol.mission.Mission;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record MissionCreateRequest(
        @NotNull Long companyId,
        @NotNull Long channelId,
        @NotNull Mission.Type type,
        @NotBlank String title,
        String description,
        @NotNull Mission.PriceOption priceOption,
        Integer userPayAmount,
        @NotNull @Min(1) Integer quotaTotal,
        @NotNull @Min(1) Integer quotaDaily,
        @NotNull LocalDateTime startAt,
        @NotNull LocalDateTime endAt,
        @Min(0) Integer requiredKeywordsCnt,
        @Min(0) Integer requiredPhotosCnt
) {}
