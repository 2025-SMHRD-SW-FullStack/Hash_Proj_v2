package com.ressol.ressol.merchant.dto;

import jakarta.validation.constraints.NotBlank;

public record CompanyUpsertRequest(
        @NotBlank String name,
        @NotBlank String bizRegNo,
        String contact,
        String address,
        String payoutBank,
        String payoutAccount,
        String payoutHolder
) {}
