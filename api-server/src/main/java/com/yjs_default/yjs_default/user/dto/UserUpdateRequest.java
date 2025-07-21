package com.yjs_default.yjs_default.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "회원정보 수정 요청 DTO")
public class UserUpdateRequest {

    @Schema(description = "닉네임", example = "홍길동")
    private String nickname;

    @Schema(description = "전화번호", example = "010-1234-5678")
    private String phone;

    @Schema(description = "생년월일", example = "900101")
    private String birth;
}
