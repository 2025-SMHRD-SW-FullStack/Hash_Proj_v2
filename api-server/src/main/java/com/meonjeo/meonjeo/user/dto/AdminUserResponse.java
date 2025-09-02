package com.meonjeo.meonjeo.user.dto;

import com.meonjeo.meonjeo.user.Role;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.seller.SellerProfile;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
public class AdminUserResponse {
    private final Long id;
    private final String nickname;
    private final String email;
    private final String shopName;
    private final Role role;
    private final LocalDateTime sanctionedUntil;

    public AdminUserResponse(User user, SellerProfile sellerProfile) {
        this.id = user.getId();
        this.nickname = user.getNickname();
        this.email = user.getEmail();
        this.role = user.getRole();
        this.shopName = (sellerProfile != null) ? sellerProfile.getShopName() : null;
        this.sanctionedUntil = user.getSanctionedUntil();
    }
}