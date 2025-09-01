// src/main/java/com/meonjeo/meonjeo/user/AccountDeletionService.java
package com.meonjeo.meonjeo.user;

import com.meonjeo.meonjeo.address.UserAddressRepository;
import com.meonjeo.meonjeo.auth.RefreshTokenRepository;
import com.meonjeo.meonjeo.seller.SellerProfileRepository;
import com.meonjeo.meonjeo.user.dto.AccountDeletionRequest;
import com.meonjeo.meonjeo.auth.AuthProvider;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountDeletionService {

    private final UserRepository userRepository;
    private final UserAddressRepository userAddressRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    /** 하드 딜리트: LOCAL=비번검증, SOCIAL=확인문구('탈퇴합니다') 검증 → 하위 리소스 삭제 → users 삭제 */
    @Transactional
    public void deleteMe(Long userId, AccountDeletionRequest req) {
        User u = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));

        if (u.getProvider() == AuthProvider.LOCAL) {
            // LOCAL: 비밀번호 필수
            if (req.getPassword() == null || req.getPassword().isBlank()
                    || !passwordEncoder.matches(req.getPassword(), u.getPassword())) {
                throw new IllegalArgumentException("PASSWORD_INVALID");
            }
            // (옵션) 확인 문구도 넣고 싶으면 아래 주석 해제
            // if (!isConfirmAccepted(req.getConfirmText())) throw new IllegalArgumentException("CONFIRM_TEXT_REQUIRED");
        } else {
            // SOCIAL: 비번 건너뛰고, 확인 문구 필수
            if (!isConfirmAccepted(req.getConfirmText())) {
                throw new IllegalArgumentException("CONFIRM_TEXT_REQUIRED");
            }
        }

        // 1) 세션 무효화
        refreshTokenRepository.deleteByUserId(userId);

        // 2) 소유 리소스 정리 (FK 충돌 예방)
        userAddressRepository.deleteByUserId(userId);
        sellerProfileRepository.deleteByUserId(userId); // ← 없으면 아래 리포지토리 추가 메서드 참고

        // 3) 최종 삭제
        userRepository.delete(u);
    }

    /** 허용하는 확인 문구 */
    private boolean isConfirmAccepted(String s) {
        if (s == null) return false;
        String t = s.trim();
        // 기본: '탈퇴합니다' 정확 일치. (테스트 편의로 '탈퇴'와 'DELETE'도 허용하려면 아래 라인 추가)
        return "탈퇴합니다".equals(t);
        // return "탈퇴합니다".equals(t) || "탈퇴".equals(t) || "DELETE".equalsIgnoreCase(t);
    }
}
