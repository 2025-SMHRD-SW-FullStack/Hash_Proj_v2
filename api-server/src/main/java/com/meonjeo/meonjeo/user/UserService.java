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

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PhoneAuthService phoneAuthService;

    /* ===== 조회 ===== */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 유저 없음"));
    }

    public Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId) {
        return userRepository.findByProviderAndProviderId(provider, providerId);
    }

    public boolean existsByProviderAndProviderId(AuthProvider provider, String providerId) {
        return userRepository.existsByProviderAndProviderId(provider, providerId);
    }

    public boolean existsByEmailOrPhone(String email, String phoneNumber) {
        String e = email == null ? null : email.trim().toLowerCase();
        String p = phoneNumber == null ? null : phoneNumber.trim();
        return userRepository.existsByEmailOrPhoneNumber(e, p);
    }

    /* ===== 회원가입 ===== */
    @Transactional
    public User registerUser(SignupRequest req) {
        final String email = req.getEmail().trim().toLowerCase();

        // 이메일 중복/소셜 충돌 체크
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User u = existing.get();
            if (u.getProvider() != AuthProvider.LOCAL) {
                throw new SocialAccountExistsException("해당 이메일은 소셜 로그인으로 이미 가입되어 있습니다.");
            }
            throw new EmailAlreadyExistsException("이미 가입된 이메일입니다.");
        }

        // 비밀번호 확인
        if (!req.getPassword().equals(req.getConfirmPassword())) {
            throw new PasswordMismatchException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        // 엔터티 생성
        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(req.getPassword()))
                .nickname(req.getNickname())
                .profileImageUrl(req.getProfileImageUrl())
                .phoneNumber(req.getPhoneNumber())
                .gender(User.Gender.valueOf(req.getGender()))
                .provider(AuthProvider.LOCAL)
                .providerId(null)          // LOCAL은 null 허용
                .role(Role.USER)
                .enabled(true)             // 가입 완료 → 로그인 가능
                .build();

        // 생년월일 파싱
        if (req.getBirthDate() != null && !req.getBirthDate().isBlank()) {
            user.setBirthDateFromString(req.getBirthDate());
        }

        // 휴대폰 인증 완료 마킹 (컨트롤러에서 validateShortToken 통과 가정)
        user.markPhoneVerified();

        return userRepository.save(user);
    }

    /* ===== 프로필 업데이트 ===== */
    @Transactional
    public User updateUserInfo(String email, UserUpdateRequest req) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));

        if (req.getNickname() != null && !req.getNickname().isBlank()) {
            user.setNickname(req.getNickname().trim());
        }
        if (req.getProfileImageUrl() != null && !req.getProfileImageUrl().isBlank()) {
            user.setProfileImageUrl(req.getProfileImageUrl().trim());
        }
        if (req.getGender() != null && !req.getGender().isBlank()) {
            user.setGender(User.Gender.valueOf(req.getGender().trim()));
        }
        if (req.getBirthDate() != null && !req.getBirthDate().isBlank()) {
            user.setBirthDateFromString(req.getBirthDate().trim());
        }

        // 전화번호 변경은 본인인증 토큰 필수
        if (req.getPhoneNumber() != null && !req.getPhoneNumber().isBlank()) {
            String newPhone = req.getPhoneNumber().trim();
            String token = req.getPhoneVerifyToken();
            if (token == null || token.isBlank()
                    || !phoneAuthService.validateShortToken(newPhone, token)) {
                throw new IllegalArgumentException("휴대폰 번호 변경은 본인인증이 필요합니다.");
            }
            user.setPhoneNumber(newPhone);
            user.markPhoneVerified();
        }

        return userRepository.save(user);
    }

    /* ===== 기타 ===== */
    public User getUserFromPrincipal(UserDetails userDetails) {
        String email = userDetails.getUsername();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));
    }

    @Transactional
    public User save(User u) { return userRepository.save(u); }
}
