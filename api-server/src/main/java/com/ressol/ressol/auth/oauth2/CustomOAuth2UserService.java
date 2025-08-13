package com.ressol.ressol.auth.oauth2;

import com.ressol.ressol.auth.AuthProvider;
import com.ressol.ressol.user.Role;
import com.ressol.ressol.user.User;
import com.ressol.ressol.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
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

    @Lazy
    private final com.ressol.ressol.user.UserService userService;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        final String registrationId = userRequest.getClientRegistration().getRegistrationId(); // google/kakao/naver
        final Map<String, Object> attributes = oauth2User.getAttributes();
        log.debug("✅ [{}] OAuth2 attributes: {}", registrationId, attributes);

        OAuth2UserInfo info = toUserInfo(registrationId, attributes);

        String providerId = nvl(info.getProviderId());
        String email = nvl(info.getEmail()); // null 가능
        String name = nvl(info.getName(), registrationId + "_user_" + providerId);
        String socialNick = nvl(info.getNickname(), name); // 👉 User.naverNickname에 매핑
        LocalDate birthDate = info.getBirthDate();

        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());

        Optional<User> existingByProvider = userRepository.findByProviderAndProviderId(provider, providerId);
        User user = existingByProvider.orElse(null);

        String normalizedEmail = sanitizeEmail(email);
        if (user == null && normalizedEmail != null) {
            Optional<User> emailOwner = userRepository.findByEmail(normalizedEmail);
            if (emailOwner.isPresent()) {
                // 동일 이메일 다른 공급자 계정이 이미 있음 → 대체 이메일 생성
                normalizedEmail = provider.name().toLowerCase() + "_" + providerId + "@social.ressol";
            }
        }
        if (user == null && normalizedEmail == null) {
            normalizedEmail = provider.name().toLowerCase() + "_" + providerId + "@social.ressol";
        }

        if (user == null) {
            try {
                user = userRepository.save(
                        User.builder()
                                .email(normalizedEmail)
                                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                                .name(name)
                                .naverNickname(socialNick)         // ✅ 닉네임은 naverNickname에 저장
                                .provider(provider)
                                .providerId(providerId)
                                .role(Role.USER)
                                .enabled(false)                    // 온보딩/휴대폰 인증 전까지 false
                                .build()
                );
            } catch (DataIntegrityViolationException e) {
            log.warn("Race on social signup: provider={}, providerId={}, email={}", provider, providerId, normalizedEmail);

            User byProvider = userRepository.findByProviderAndProviderId(provider, providerId).orElse(null);
            if (byProvider != null) {
                user = byProvider;
            } else {
                user = userRepository.findByEmail(normalizedEmail).orElseThrow(() -> e);
            }
        }

    }

        boolean changed = false;
        if (user.getNaverNickname() == null && socialNick != null) {
            user.setNaverNickname(socialNick);
            changed = true;
        }
        if (user.getBirthDate() == null && birthDate != null) {
            user.setBirthDate(birthDate);
            changed = true;
        }
        if (changed) userRepository.save(user);

        Map<String, Object> customAttributes = Map.of(
                "email", user.getEmail(),
                "nickname", user.getNaverNickname(),
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
        if (v == null) return null;
        String trimmed = v.trim();
        return trimmed.isEmpty() ? null : trimmed.toLowerCase();
    }
    private static String nvl(String v) { return (v == null || v.isBlank()) ? null : v; }
    private static String nvl(String v, String alt) { return (v == null || v.isBlank()) ? alt : v; }
}
