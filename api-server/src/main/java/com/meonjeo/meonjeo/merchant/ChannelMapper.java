package com.meonjeo.meonjeo.merchant;

import com.meonjeo.meonjeo.merchant.dto.ChannelDto;
import org.springframework.stereotype.Component;

@Component
public class ChannelMapper {
    public ChannelDto toDto(CompanyChannel c){
        return new ChannelDto(
                c.getId(), c.getCompanyId(), c.getType(), c.getDisplayName(),
                c.getAddress(), c.getContact(), c.getOpeningHours(),
                c.getPlatform(), c.getExternalId(), c.getUrl(), c.isActive()
        );
    }
}
