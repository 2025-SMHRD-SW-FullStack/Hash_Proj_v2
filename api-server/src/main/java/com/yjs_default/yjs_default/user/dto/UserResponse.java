package com.yjs_default.yjs_default.user.dto;

import com.yjs_default.yjs_default.auth.AuthProvider;
import com.yjs_default.yjs_default.user.User;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;

@Getter
@Schema(description = "사용자 응답 DTO")
public class UserResponse {

    @Schema(description = "사용자 ID", example = "1")
    private Long id;

    @Schema(description = "이메일", example = "test@example.com")
    private String email;

    @Schema(description = "닉네임", example = "홍길동")
    private String nickname;

    @Schema(description = "이름", example = "홍길동")
    private String name;

    @Schema(description = "전화번호", example = "010-1234-5678")
    private String phone;

    @Schema(description = "생년월일", example = "900101")
    private String birth;

    @Schema(description = "소셜 제공자 (LOCAL, GOOGLE 등)", example = "LOCAL")
    private String provider;

    @Schema(description = "소셜 로그인 사용자인지 여부", example = "false")
    private boolean isSocialUser;

    public UserResponse(User user, boolean isSocialUser) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.nickname = user.getNickname();
        this.name = user.getName();
        this.phone = user.getPhone();
        this.birth = user.getBirth();
        this.provider = user.getProvider() != null ? user.getProvider().name() : null;
        this.isSocialUser = isSocialUser;
    }

    // 기본 생성자도 유지
    public UserResponse(User user) {
        this(user, user.getProvider() != null && user.getProvider() != AuthProvider.LOCAL);
    }
}
