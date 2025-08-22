package com.meonjeo.meonjeo.auth;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "인증 제공자 타입 (LOCAL, GOOGLE, KAKAO, NAVER)")
public enum AuthProvider {
    LOCAL, GOOGLE, KAKAO, NAVER
}