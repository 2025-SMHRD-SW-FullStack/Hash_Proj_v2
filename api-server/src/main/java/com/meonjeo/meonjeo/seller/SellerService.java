package com.meonjeo.meonjeo.seller;

import com.meonjeo.meonjeo.auth.CustomUserDetails;
import com.meonjeo.meonjeo.seller.dto.SellerApplyRequest;
import com.meonjeo.meonjeo.seller.dto.SellerProfileResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class SellerService {
    private final SellerProfileRepository repo;

    // ===== 공용 =====
    public boolean isApprovedSeller(Long userId){
        if (userId == null) return false;
        return repo.existsByUserIdAndStatus(userId, SellerStatus.APPROVED);
    }

    private Long currentUserId(){
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || a.getPrincipal() == null) return null;
        if (a.getPrincipal() instanceof CustomUserDetails d) return d.getUserId();
        return null;
    }

    // ===== 사용자: 신청/조회 =====
    @Transactional
    public SellerProfileResponse apply(SellerApplyRequest r){
        Long uid = currentUserId();
        if (uid == null) throw new IllegalStateException("UNAUTHORIZED");

        SellerProfile sp = repo.findByUserId(uid).orElseGet(() ->
                SellerProfile.builder().userId(uid).status(SellerStatus.PENDING).build());

        if (sp.getStatus() == SellerStatus.APPROVED) {
            throw new IllegalStateException("ALREADY_APPROVED");
        }
        // REJECTED → 재신청 허용: 상태 PENDING 으로 전환
        sp.setStatus(SellerStatus.PENDING);
        sp.setRejectReason(null);

        sp.setBizNo(nvl(r.bizNo()));
        sp.setShopName(nvl(r.shopName()));
        sp.setOwnerName(nvl(r.ownerName()));
        sp.setAddr(nvl(r.addr()));
        sp.setCategory(nvl(r.category()));
        sp.setPhone(nvl(r.phone()));

        repo.save(sp);
        // fetch join 위해 다시 로드
        return repo.findById(sp.getId()).map(SellerProfileResponse::of).orElseThrow();
    }

    @Transactional(readOnly = true)
    public SellerProfileResponse me(){
        Long uid = currentUserId();
        if (uid == null) throw new IllegalStateException("UNAUTHORIZED");
        return repo.findByUserId(uid).map(SellerProfileResponse::of)
                .orElse(null);
    }

    // ===== 관리자: 목록/상세/승인/거절 =====
    @Transactional(readOnly = true)
    public Page<SellerProfileResponse> adminSearch(SellerStatus status, String q, Pageable pageable){
        return repo.searchForAdmin(status, q, pageable).map(SellerProfileResponse::of);
    }

    @Transactional(readOnly = true)
    public SellerProfileResponse adminGet(Long id){
        return repo.findById(id).map(SellerProfileResponse::of).orElse(null);
    }

    @Transactional
    public SellerProfileResponse approve(Long id, String memo){
        SellerProfile sp = repo.findById(id).orElseThrow();
        sp.setStatus(SellerStatus.APPROVED);
        sp.setRejectReason(null);
        repo.save(sp);
        return SellerProfileResponse.of(sp);
    }

    @Transactional
    public SellerProfileResponse reject(Long id, String reason){
        SellerProfile sp = repo.findById(id).orElseThrow();
        sp.setStatus(SellerStatus.REJECTED);
        sp.setRejectReason(nvl(reason));
        repo.save(sp);
        return SellerProfileResponse.of(sp);
    }

    private static String nvl(String s){ return (s == null || s.isBlank()) ? null : s.trim(); }
}
