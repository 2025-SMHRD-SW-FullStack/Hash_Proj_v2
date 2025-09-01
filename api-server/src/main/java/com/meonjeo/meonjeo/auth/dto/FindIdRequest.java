package com.meonjeo.meonjeo.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Schema(description = "아이디 찾기 요청")
public class FindIdRequest {
    @NotBlank
    @Schema(description = "휴대폰 번호(010-1234-5678 등 사용자가 입력한 원문)", example = "01012345678")
    private String phoneNumber;

    @NotBlank
    @Schema(description = "문자인증 성공 후 발급된 단기 토큰")
    private String phoneVerifyToken;
}
