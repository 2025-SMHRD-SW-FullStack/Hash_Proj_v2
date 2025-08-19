package com.ressol.ressol.mission;

import com.ressol.ressol.mission.dto.MissionDto;
import org.springframework.stereotype.Component;

@Component
public class MissionMapper {
    public MissionDto toDto(Mission m){
        return new MissionDto(
                m.getId(), m.getCompanyId(), m.getChannelId(), m.getType(),
                m.getTitle(), m.getDescription(), m.getPriceOption(), m.getUserPayAmount(),
                m.getQuotaTotal(), m.getQuotaDaily(), m.getStartAt(), m.getEndAt(),
                m.getRequiredKeywordsCnt(), m.getRequiredPhotosCnt(), m.getStatus()
        );
    }
}
