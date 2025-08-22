package com.meonjeo.meonjeo.mission.dto;

import com.meonjeo.meonjeo.mission.Mission;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
        Mission.Status status,

        String productName,
        List<String> requiredKeywords,
        List<String> forbidWords,
        Integer minTextChars,
        Boolean allowEmoji,
        Boolean allowHashtags,
        String instructions,
        Integer desiredLength,
        String toneLabel,
        String systemPrompt,
        Map<String, Object> meta
) {}
