package com.yjs_default.yjs_default.user;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "유저 권한 (USER, ADMIN 등)")
public enum Role {
    USER, ADMIN
}