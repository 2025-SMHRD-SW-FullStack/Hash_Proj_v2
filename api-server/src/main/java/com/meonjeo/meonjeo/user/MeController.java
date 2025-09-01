package com.meonjeo.meonjeo.user;

import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.seller.SellerProfileJdbcRepository;
import com.meonjeo.meonjeo.user.dto.MeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository userRepo;
    private final SellerProfileJdbcRepository sellerJdbc;
    private final AuthSupport auth;

    @GetMapping("/me")
    public MeResponse me() {
        Long uid = auth.currentUserId();
        User u = userRepo.findById(uid).orElseThrow();

        // roles 구성: USER 기본, ADMIN이면 추가, SELLER 승인 시 추가
        List<String> roles = new ArrayList<>();
        roles.add("USER");
        boolean isAdmin = (u.getRole() == Role.ADMIN);
        if (isAdmin) roles.add("ADMIN");

        boolean isSeller = sellerJdbc.isApproved(uid);
        if (isSeller) roles.add("SELLER");

        return MeResponse.builder()
                .id(u.getId())
                .email(u.getEmail())
                .nickname(u.getNickname())
                .profileImageUrl(u.getProfileImageUrl())
                .roles(roles)
                .isSeller(isSeller)
                .isAdmin(isAdmin)
                .build();
    }
}
