package com.meonjeo.meonjeo.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @NoArgsConstructor
public class TokenRequest {
    private String refreshToken;
}
