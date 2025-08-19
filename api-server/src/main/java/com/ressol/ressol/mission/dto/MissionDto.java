package com.ressol.ressol.mission.dto;

import com.ressol.ressol.mission.Mission;

import java.time.LocalDateTime;

public record MissionDto(
        Long id,
        Long companyId,
        Long channelId,
        Mission.Type type,
        String title,
        String description,
        Mission.PriceOption priceOption,
        Integer userPayAmount,
        Integer quotaTotal,
        Integer quotaDaily,
        LocalDateTime startAt,
        LocalDateTime endAt,
        Integer requiredKeywordsCnt,
        Integer requiredPhotosCnt,
        Mission.Status status
) {}
