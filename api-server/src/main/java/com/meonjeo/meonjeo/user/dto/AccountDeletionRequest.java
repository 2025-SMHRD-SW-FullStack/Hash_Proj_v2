// src/main/java/com/meonjeo/meonjeo/user/dto/AccountDeletionRequest.java
package com.meonjeo.meonjeo.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "회원탈퇴 요청: LOCAL은 password 필수, SOCIAL은 confirmText 필수('탈퇴합니다')")
public class AccountDeletionRequest {

    @Schema(description = "현재 비밀번호 (LOCAL 전용)", example = "P@ssw0rd!")
    private String password;

    @Schema(description = "추가 확인 문구 (SOCIAL 전용). 정확히 '탈퇴합니다' 입력", example = "탈퇴합니다")
    private String confirmText;
}
