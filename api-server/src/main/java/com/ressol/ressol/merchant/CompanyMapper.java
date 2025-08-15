package com.ressol.ressol.merchant;

import com.ressol.ressol.merchant.dto.CompanyDto;
import org.springframework.stereotype.Component;

@Component
public class CompanyMapper {
    public CompanyDto toDto(Company c){
        return new CompanyDto(
                c.getId(),
                c.getOwner().getId(),
                c.getName(),
                c.getBizRegNo(),
                c.getContact(),
                c.getAddress(),
                c.getPayoutBank(),
                c.getPayoutAccount(),
                c.getPayoutHolder(),
                c.getStatus(),
                c.getRejectReason()
        );
    }
}
