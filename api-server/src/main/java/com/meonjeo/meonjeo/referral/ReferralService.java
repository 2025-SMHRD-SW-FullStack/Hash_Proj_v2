package com.meonjeo.meonjeo.referral;

import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ReferralService {

    private final UserRepository userRepository;
    private static final SecureRandom RND = new SecureRandom();
    private static final char[] ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    /** 내 추천코드 조회(없으면 발급하여 저장) */
    @Transactional
    public String getOrIssueMyCode(Long userId) {
        User me = userRepository.findById(userId).orElseThrow();
        if (me.getReferralCode() == null) {
            me.setReferralCode(issueUniqueCode());
            userRepository.save(me);
        }
        return me.getReferralCode();
    }

    /** 가입 시 입력된 추천코드로 추천인 찾기 */
    @Transactional(readOnly = true)
    public Optional<User> findReferrerByCode(String code) {
        if (code == null || code.isBlank()) return Optional.empty();
        return userRepository.findByReferralCode(code.trim().toUpperCase());
    }

    private String issueUniqueCode() {
        String code;
        do { code = "RS-" + randomAlphaNum(6); }
        while (userRepository.existsByReferralCode(code));
        return code;
    }

    private String randomAlphaNum(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) sb.append(ALPHANUM[RND.nextInt(ALPHANUM.length)]);
        return sb.toString();
    }
}
