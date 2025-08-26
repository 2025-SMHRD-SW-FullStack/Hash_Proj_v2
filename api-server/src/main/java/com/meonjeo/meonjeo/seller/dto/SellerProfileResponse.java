package com.meonjeo.meonjeo.seller.dto;

import com.meonjeo.meonjeo.seller.SellerProfile;
import com.meonjeo.meonjeo.seller.SellerStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

@Schema(name="SellerProfileResponse")
public record SellerProfileResponse(
        Long id, Long userId,
        String bizNo, String shopName, String ownerName,
        String addr, String category, String phone,
        SellerStatus status, String rejectReason,
        LocalDateTime createdAt, LocalDateTime updatedAt,
        String userEmail, String userName
) {
    public static SellerProfileResponse of(SellerProfile sp){
        return new SellerProfileResponse(
                sp.getId(), sp.getUserId(),
                sp.getBizNo(), sp.getShopName(), sp.getOwnerName(),
                sp.getAddr(), sp.getCategory(), sp.getPhone(),
                sp.getStatus(), sp.getRejectReason(),
                sp.getCreatedAt(), sp.getUpdatedAt(),
                sp.getUserRef() != null ? sp.getUserRef().getEmail() : null,
                sp.getUserRef() != null ? sp.getUserRef().getNickname() : null
        );
    }
}
