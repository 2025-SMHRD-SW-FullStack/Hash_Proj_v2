package com.meonjeo.meonjeo.user;

import com.meonjeo.meonjeo.auth.AuthProvider;
import com.meonjeo.meonjeo.exception.EmailAlreadyExistsException;
import com.meonjeo.meonjeo.exception.PasswordMismatchException;
import com.meonjeo.meonjeo.exception.SocialAccountExistsException;
import com.meonjeo.meonjeo.phone.PhoneAuthService;
import com.meonjeo.meonjeo.seller.SellerProfile;
import com.meonjeo.meonjeo.seller.SellerProfileRepository;
import com.meonjeo.meonjeo.user.dto.AdminUserResponse;
import com.meonjeo.meonjeo.user.dto.SignupRequest;
import com.meonjeo.meonjeo.user.dto.UserUpdateRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PhoneAuthService phoneAuthService;
    private final SellerProfileRepository sellerProfileRepository;

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

    /* ===== 회원가입(로컬) ===== */
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
                // ✅ gender: "M"/"F"만 유지, "UNKNOWN"/빈문자/이상값/null → null
                .gender(toGenderOrNull(req.getGender()))
                .provider(AuthProvider.LOCAL)
                .providerId(null)          // LOCAL은 null 허용
                .role(Role.USER)
                .enabled(true)             // 가입 완료 → 로그인 가능
                .build();

        // 생년월일 파싱(빈값이면 null)
        user.setBirthDateFromString(req.getBirthDate());

        // 휴대폰 인증 완료 마킹 (컨트롤러에서 validateShortToken 통과 가정)
        user.markPhoneVerified();

        return userRepository.save(user);
    }

    /* ===== 프로필 업데이트 ===== */
    @Transactional
    public User updateUserInfo(String email, UserUpdateRequest req) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));

        if (req.getNickname() != null) {
            String v = req.getNickname().trim();
            if (!v.isBlank()) user.setNickname(v);
        }
        if (req.getProfileImageUrl() != null) {
            String v = req.getProfileImageUrl().trim();
            user.setProfileImageUrl(v.isBlank() ? null : v);
        }

        // ✅ 성별: null/빈문자/UNKNOWN/이상값은 지우기, "M"/"F"만 세팅
        if (req.getGender() != null) {
            user.setGender(toGenderOrNull(req.getGender()));
        }

        // ✅ 생년월일: null/빈문자면 지우기, 값 있으면 파싱
        if (req.getBirthDate() != null) {
            String v = req.getBirthDate().trim();
            if (v.isBlank()) user.setBirthDate(null);
            else user.setBirthDateFromString(v);
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

    /** "M"/"F"만 유지, 그 외는 전부 null로 정규화 */
    private User.Gender toGenderOrNull(String g) {
        if (g == null) return null;
        String v = g.trim().toUpperCase();
        if (v.isEmpty() || "UNKNOWN".equals(v)) return null;
        try {
            User.Gender parsed = User.Gender.valueOf(v);
            return (parsed == User.Gender.M || parsed == User.Gender.F) ? parsed : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /* ===== 기타 ===== */
    public User getUserFromPrincipal(UserDetails userDetails) {
        String e = userDetails.getUsername();
        return userRepository.findByEmail(e)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));
    }

    @Transactional
    public User save(User u) { return userRepository.save(u); }

    /* ===== 관리자용 ===== */
    public Page<AdminUserResponse> adminSearchUsers(String q, Role role, Pageable pageable) {
        Page<User> users = userRepository.searchForAdmin(q, role, pageable);
        return users.map(user -> {
            SellerProfile sp = sellerProfileRepository.findByUserId(user.getId()).orElse(null);
            return new AdminUserResponse(user, sp);
        });
    }

    @Transactional
    public void adminSanctionUser(Long userId, LocalDateTime sanctionUntil) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        user.setSanctionedUntil(sanctionUntil);
        userRepository.save(user);
    }
}
