package com.meonjeo.meonjeo.user;

import com.meonjeo.meonjeo.auth.AuthProvider;
import com.meonjeo.meonjeo.exception.EmailAlreadyExistsException;
import com.meonjeo.meonjeo.exception.PasswordMismatchException;
import com.meonjeo.meonjeo.exception.SocialAccountExistsException;
import com.meonjeo.meonjeo.phone.PhoneAuthService;
import com.meonjeo.meonjeo.user.dto.SignupRequest;
import com.meonjeo.meonjeo.user.dto.UserUpdateRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PhoneAuthService phoneAuthService;

    public Optional<User> findByEmail(String email) { return userRepository.findByEmail(email); }
    public User findById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("해당 유저 없음"));
    }
    public Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId) {
        return userRepository.findByProviderAndProviderId(provider, providerId);
    }
    public boolean existsByProviderAndProviderId(AuthProvider provider, String providerId) {
        return userRepository.existsByProviderAndProviderId(provider, providerId);
    }
    public boolean existsByEmailOrPhone(String email, String phoneNumber) {
        boolean byEmail = (email != null) && userRepository.findByEmail(email.trim().toLowerCase()).isPresent();
        boolean byPhone = (phoneNumber != null) && userRepository.findByPhoneNumber(phoneNumber.trim()).isPresent();
        return byEmail || byPhone;
    }

    /* ===== 회원가입 ===== */
    @Transactional
    public User registerUser(SignupRequest req) {
        String email = req.getEmail().trim().toLowerCase();

        // 이메일 중복/소셜 계정 충돌
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User u = existing.get();
            if (u.getProvider() != AuthProvider.LOCAL) {
                throw new SocialAccountExistsException("해당 이메일은 소셜 로그인으로 이미 가입되어 있습니다.");
            }
            throw new EmailAlreadyExistsException("이미 가입된 이메일입니다.");
        }

        // 비번 확인
        if (!req.getPassword().equals(req.getConfirmPassword())) {
            throw new PasswordMismatchException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        // User 생성
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(req.getPassword()))
                .name(req.getName())
                .naverNickname(req.getNaverNickname())
                .phoneNumber(req.getPhoneNumber())
                .address(req.getAddress())
                .gender(req.getGender() != null ? User.Gender.valueOf(req.getGender()) : null)
                .naverReviewUrl(req.getNaverReviewUrl()) // ✅ SignupRequest 기준 반영
                .provider(AuthProvider.LOCAL)
                .providerId("local_" + email)
                .role(Role.USER)
                .enabled(true)
                .build();

        if (req.getBirthDate() != null && !req.getBirthDate().isBlank()) {
            user.setBirthDateFromString(req.getBirthDate());
        }

        // 휴대폰 인증 완료 처리 (컨트롤러에서 validateShortToken 통과 가정)
        user.markPhoneVerified(req.getPhoneNumber());

        // 추천인 기록(컨트롤러에서 referrer 보상 처리) + 내 추천코드 생성
        if (user.getReferralCode() == null || user.getReferralCode().isBlank()) {
            user.setReferralCode(generateUniqueReferralCode());
        }

        return userRepository.save(user);
    }

    /* ===== 추천코드 생성(중복 회피) ===== */
    private String generateUniqueReferralCode() {
        final String PREFIX = "RS-";
        final String ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        SecureRandom rnd = new SecureRandom();
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder(PREFIX);
            for (int i = 0; i < 6; i++) sb.append(ALPH.charAt(rnd.nextInt(ALPH.length())));
            String code = sb.toString();
            if (!userRepository.existsByReferralCode(code)) return code;
        }
        // 최후 수단: 타임스탬프
        return PREFIX + Long.toString(System.currentTimeMillis(), 36).toUpperCase();
    }

    /* ===== 프로필 업데이트 ===== */
    @Transactional
    public User updateUserInfo(String email, UserUpdateRequest req) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));

        if (req.getNaverNickname() != null) user.setNaverNickname(req.getNaverNickname());
        if (req.getAddress() != null) user.setAddress(req.getAddress());
        if (req.getNaverReviewUrl() != null) user.setNaverReviewUrl(req.getNaverReviewUrl());

        if (req.getBirthDate() != null && !req.getBirthDate().isBlank()) {
            user.setBirthDateFromString(req.getBirthDate());
        }

        // 전화번호 변경은 본인인증 토큰 검증 필수
        if (req.getPhoneNumber() != null && !req.getPhoneNumber().isBlank()) {
            String newPhone = req.getPhoneNumber().trim();
            String token = req.getPhoneVerifyToken();
            if (token == null || token.isBlank()
                    || !phoneAuthService.validateShortToken(newPhone, token)) {
                throw new IllegalArgumentException("휴대폰 번호 변경은 본인인증이 필요합니다.");
            }
            user.markPhoneVerified(newPhone);
        }

        return userRepository.save(user);
    }

    public User getUserFromPrincipal(UserDetails userDetails) {
        String email = userDetails.getUsername();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));
    }

    @Transactional
    public User save(User u) { return userRepository.save(u); }
}
