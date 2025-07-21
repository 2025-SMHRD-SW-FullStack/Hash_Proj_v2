package com.yjs_default.yjs_default.user;

import com.yjs_default.yjs_default.auth.AuthProvider;
import com.yjs_default.yjs_default.company.Company;
import com.yjs_default.yjs_default.email.EmailVerificationTokenRepository;
import com.yjs_default.yjs_default.exception.EmailAlreadyExistsException;
import com.yjs_default.yjs_default.exception.PasswordMismatchException;
import com.yjs_default.yjs_default.exception.SocialAccountExistsException;
import com.yjs_default.yjs_default.user.dto.SignupRequest;
import com.yjs_default.yjs_default.user.dto.UserUpdateRequest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationTokenRepository emailVerificationTokenRepository;

    public UserService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       EmailVerificationTokenRepository emailVerificationTokenRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationTokenRepository = emailVerificationTokenRepository;
    }

    /**
     * 이메일 인증 여부 확인
     */
    public boolean isEmailVerified(String email) {
        return emailVerificationTokenRepository.existsByEmailAndVerifiedTrue(email.toLowerCase());
    }

    /**
     * 일반 회원가입 처리
     */
    public User registerUser(SignupRequest request) {
        String email = request.getEmail();

        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User user = existing.get();
            if (user.getProvider() != AuthProvider.LOCAL) {
                throw new SocialAccountExistsException("해당 이메일은 소셜 로그인으로 이미 가입되어 있습니다.");
            }
            throw new EmailAlreadyExistsException("이미 가입된 이메일입니다.");
        }

        // ✅ 비밀번호와 확인용 비밀번호 일치 검증
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new PasswordMismatchException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        Company company = Company.createFrom(request);

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .name(request.getName())
                .nickname(request.getNickname())
                .birth(request.getBirth())
                .gender(request.getGender())
                .phone(request.getPhone())
                .provider(AuthProvider.LOCAL)
                .providerId("local_" + email)
                .role(Role.USER)
                .enabled(true)
                .company(company)
                .build();

        return userRepository.save(user);
    }

    /**
     * 이메일로 사용자 조회
     */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * Id로 사용자 조회
     */
    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 유저 없음"));
    }

    /**
     * provider + providerId 기반 사용자 조회 (소셜 전용)
     */
    public Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId) {
        return userRepository.findByProviderAndProviderId(provider, providerId);
    }

    /**
     * 사용자 정보 업데이트 (ex. 닉네임 변경 등)
     */
    public User updateUser(User user, String newNickname) {
        user.setNickname(newNickname);
        return userRepository.save(user);
    }

    /**
     * 마이페이지 응답용: isSocialUser 여부 포함
     */
    public boolean isSocialUser(User user) {
        return user.getProvider() != null && user.getProvider() != AuthProvider.LOCAL;
    }

    /**
     * 일단 닉네임만 수정 가능 // 나중에 회사정보수정이랑 비번수정도 넣을거임
     */
    public User updateNickname(String email, String newNickname) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        user.setNickname(newNickname);
        return userRepository.save(user);
    }

    public boolean existsByProviderAndProviderId(AuthProvider provider, String providerId) {
        return userRepository.existsByProviderAndProviderId(provider, providerId);
    }

    /**
     * 회사정보수정
     */
    public User getUserFromPrincipal(UserDetails userDetails) {
        String email = userDetails.getUsername();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));
    }

    /**
     * 회원정보 수정 (닉네임, 이름, 전화번호, 생년월일)
     */
    public User updateUserInfo(String email, UserUpdateRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));

        user.setNickname(request.getNickname());
        user.setPhone(request.getPhone());
        user.setBirth(request.getBirth());

        return userRepository.save(user);
    }

}