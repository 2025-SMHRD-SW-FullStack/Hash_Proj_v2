package com.meonjeo.meonjeo.merchant.dto;

import com.meonjeo.meonjeo.merchant.Company;

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
