package com.meonjeo.meonjeo.user;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "유저 권한")
public enum Role {
    USER,          // 일반 사용자 or 사장님
    ADMIN     // 슈퍼관리자(개발/운영)
}
