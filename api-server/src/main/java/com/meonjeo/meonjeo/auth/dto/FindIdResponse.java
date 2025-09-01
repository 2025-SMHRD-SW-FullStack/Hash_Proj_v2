package com.meonjeo.meonjeo.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
@Schema(description = "아이디 찾기 응답")
public class FindIdResponse {
    @Schema(description = "해당 전화번호로 가입된 이메일 목록(일반적으로 1개)")
    private List<String> emails;

    @Schema(description = "총 개수")
    private int count;
}
