package com.meonjeo.meonjeo.auth.oauth2;

import com.meonjeo.meonjeo.auth.AuthProvider;
import com.meonjeo.meonjeo.user.Role;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        final String registrationId = userRequest.getClientRegistration().getRegistrationId(); // google/kakao/naver
        final Map<String, Object> attributes = oauth2User.getAttributes();
        log.debug("✅ [{}] OAuth2 attributes: {}", registrationId, attributes);

        OAuth2UserInfo info = toUserInfo(registrationId, attributes);

        String providerId = nvl(info.getProviderId());
        String email = sanitizeEmail(nvl(info.getEmail()));
        String nickname = nvl(info.getNickname(), registrationId + "_user_" + providerId);
        LocalDate birthDate = info.getBirthDate(); // 제공 안 하면 null

        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());

        // 1) provider + providerId 로 기존 사용자 검색
        Optional<User> existingByProvider = userRepository.findByProviderAndProviderId(provider, providerId);
        User user = existingByProvider.orElse(null);

        // 2) 최초 가입인 경우 이메일 충돌 회피 및 대체 이메일 생성
        if (user == null) {
            if (email == null || userRepository.findByEmail(email).isPresent()) {
                // 이메일이 없거나 이미 존재하면 provider 기반 대체 이메일 생성
                String pid = (providerId != null ? providerId : UUID.randomUUID().toString());
                email = provider.name().toLowerCase() + "_" + pid + "@social.mej";
            }

            // ⚠️ phoneNumber / profileImageUrl 같은 '선택 필드'는 아예 세팅하지 않는다(null 유지)
            user = User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                    .nickname(nickname)
                    .gender(User.Gender.UNKNOWN)
                    .birthDate(birthDate != null ? birthDate : LocalDate.of(2000, 1, 1))
                    .provider(provider)
                    .providerId(providerId)
                    .role(Role.USER)
                    .enabled(true) // 온보딩 단계에서 막고 싶으면 false로 바꾸고, 후속 활성화 로직 추가
                    .build();

            user = userRepository.save(user);
        } else {
            // 3) 기존 사용자면 결측만 보완
            boolean changed = false;
            if (isBlank(user.getNickname()) && !isBlank(nickname)) { user.setNickname(nickname); changed = true; }
            if (user.getBirthDate() == null && birthDate != null) { user.setBirthDate(birthDate); changed = true; }
            if (changed) user = userRepository.save(user);
        }

        Map<String, Object> customAttributes = Map.of(
                "email", user.getEmail(),
                "nickname", user.getNickname(),
                "provider", registrationId
        );
        return new CustomOAuth2User(user, customAttributes);
    }

    private OAuth2UserInfo toUserInfo(String registrationId, Map<String, Object> attributes) {
        switch (registrationId) {
            case "google": return new GoogleUserInfo(attributes);
            case "kakao":  return new KakaoUserInfo(attributes);
            case "naver":  return new NaverUserInfo(attributes);
            default: throw new IllegalArgumentException("지원하지 않는 OAuth Provider: " + registrationId);
        }
    }

    private static String sanitizeEmail(String v) {
        return v == null ? null : v.trim().toLowerCase();
    }
    private static String nvl(String v) { return (v == null || v.isBlank()) ? null : v; }
    private static String nvl(String v, String alt) { return (v == null || v.isBlank()) ? alt : v; }
    private static boolean isBlank(String v) { return v == null || v.isBlank(); }
}
