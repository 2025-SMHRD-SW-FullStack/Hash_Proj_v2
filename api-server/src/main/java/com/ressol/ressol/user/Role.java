package com.ressol.ressol.user;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "유저 권한")
public enum Role {
    USER,          // 일반 사용자
    ADMIN,         // 가게/스마트스토어 사장(중간 관리자)
    SUPERADMIN     // 슈퍼관리자(개발/운영)
}
