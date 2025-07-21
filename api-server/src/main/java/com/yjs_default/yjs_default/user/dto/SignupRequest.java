package com.yjs_default.yjs_default.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "회원가입 요청 DTO")
public class SignupRequest {

    @Schema(description = "이메일", example = "test@example.com")
    private String email;

    @Schema(description = "비밀번호", example = "password123")
    private String password;

    @Schema(description = "비밀번호 확인", example = "password123")
    private String confirmPassword;

    @Schema(description = "닉네임", example = "홍길동")
    private String nickname;

    @Schema(description = "성별", example = "M,F")
    private String gender;

    @Schema(description = "이름", example = "홍길동")
    private String name;

    @Schema(description = "전화번호", example = "010-1234-5678")
    private String phone;

    @Schema(description = "생년월일", example = "900101")
    private String birth;

    // 회사 정보 (선택 입력)
    @Schema(description = "회사명", example = "글로벌고 주식회사")
    private String companyName;

    @Schema(description = "대표자명", example = "유준선")
    private String ceoName;

    @Schema(description = "사업자 등록번호", example = "123-45-67890")
    private String businessNumber;

    @Schema(description = "업종", example = "제조업")
    private String industry;

    @Schema(description = "수출 품목", example = "반도체 부품")
    private String product;

    @Schema(description = "주소", example = "서울특별시 강남구 테헤란로 123")
    private String address;
}
