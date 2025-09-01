package com.meonjeo.meonjeo.user.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MeResponse {
    private Long id;
    private String email;
    private String nickname;
    private String profileImageUrl;
    /** 예: ["USER","SELLER","ADMIN"] */
    private List<String> roles;
    private boolean isSeller;
    private boolean isAdmin;
}
