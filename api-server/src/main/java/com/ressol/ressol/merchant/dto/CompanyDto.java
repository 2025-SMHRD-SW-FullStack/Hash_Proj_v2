package com.ressol.ressol.merchant.dto;

import com.ressol.ressol.merchant.Company;

public record CompanyDto(
        Long id,
        Long ownerUserId,
        String name,
        String bizRegNo,
        String contact,
        String address,
        String payoutBank,
        String payoutAccount,
        String payoutHolder,
        Company.Status status,
        String rejectReason
) {}
