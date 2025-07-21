package com.yjs_default.yjs_default.user.dto;

import com.yjs_default.yjs_default.auth.AuthProvider;
import com.yjs_default.yjs_default.company.Company;
import com.yjs_default.yjs_default.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Schema(description = "마이페이지 응답 DTO")
public class MyPageResponse {

    @Schema(description = "사용자 ID", example = "1")
    private Long id;

    @Schema(description = "이메일", example = "test@example.com")
    private String email;

    @Schema(description = "닉네임", example = "유준선짱")
    private String nickname;

    @Schema(description = "이름", example = "홍길동")
    private String name;

    @Schema(description = "전화번호", example = "010-1234-5678")
    private String phone;

    @Schema(description = "생년월일", example = "900101")
    private String birth;

    @Schema(description = "소셜 로그인 여부", example = "true")
    private boolean isSocialUser;

    @Schema(description = "가입 일시", example = "2024-01-01T12:34:56")
    private LocalDateTime createdAt;

    // 회사 정보
    @Schema(description = "회사명", example = "글로벌고 주식회사")
    private String companyName;

    @Schema(description = "사업자 등록번호", example = "123-45-67890")
    private String businessNumber;

    @Schema(description = "대표자명", example = "유준선")
    private String ceoName;

    @Schema(description = "업종", example = "제조업")
    private String industry;

    @Schema(description = "수출 품목", example = "반도체 부품")
    private String product;

    @Schema(description = "주소", example = "서울특별시 강남구 테헤란로 123")
    private String address;

    public MyPageResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.nickname = user.getNickname();
        this.name = user.getName();
        this.phone = user.getPhone();
        this.birth = user.getBirth();
        this.isSocialUser = user.getProvider() != null && user.getProvider() != AuthProvider.LOCAL;
        this.createdAt = user.getCreatedAt();

        Company company = user.getCompany();
        if (company != null) {
            this.companyName = company.getName();
            this.businessNumber = company.getBusinessNumber();
            this.ceoName = company.getCeoName();
            this.industry = company.getIndustry();
            this.product = company.getProduct();
            this.address = company.getAddress();
        }
    }
}
