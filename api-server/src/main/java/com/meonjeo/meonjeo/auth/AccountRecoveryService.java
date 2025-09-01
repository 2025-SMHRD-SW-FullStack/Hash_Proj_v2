package com.meonjeo.meonjeo.auth;

import com.meonjeo.meonjeo.auth.dto.FindIdRequest;
import com.meonjeo.meonjeo.auth.dto.FindIdResponse;
import com.meonjeo.meonjeo.auth.dto.PasswordResetRequest;
import com.meonjeo.meonjeo.phone.PhoneAuthService;
import com.meonjeo.meonjeo.phone.PhoneFmt;
import com.meonjeo.meonjeo.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AccountRecoveryService {

    private final UserRepository userRepository;
    private final PhoneAuthService phoneAuthService;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;

    public FindIdResponse findId(FindIdRequest req) {
        boolean ok = phoneAuthService.validateShortToken(req.getPhoneNumber(), req.getPhoneVerifyToken());
        if (!ok) throw new IllegalArgumentException("PHONE_NOT_VERIFIED");

        String raw = req.getPhoneNumber();
        String pE164 = PhoneFmt.toE164Kr(raw);
        String pDigits = raw.replaceAll("[^0-9]", ""); // 01012345678 형태

        var u = userRepository.findByPhoneNumber(pE164)
                .or(() -> userRepository.findByPhoneNumber(raw))     // 하이픈 포함 원문
                .or(() -> userRepository.findByPhoneNumber(pDigits)) // 숫자만
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));

        if (u.getProvider() != AuthProvider.LOCAL)
            throw new IllegalArgumentException("SOCIAL_ACCOUNT_NOT_SUPPORTED");

        return new FindIdResponse(List.of(u.getEmail()), 1);
    }

    private boolean phoneMatches(String saved, String inputRaw) {
        if (saved == null) return false;
        String e164 = PhoneFmt.toE164Kr(inputRaw);
        String digits = inputRaw.replaceAll("[^0-9]", "");
        return saved.equals(e164) || saved.equals(inputRaw) || saved.equals(digits);
    }

    @Transactional
    public void resetPassword(PasswordResetRequest req) {
        if (!Objects.equals(req.getNewPassword(), req.getNewPasswordConfirm()))
            throw new IllegalArgumentException("PASSWORD_CONFIRM_MISMATCH");
        if (req.getNewPassword() == null || req.getNewPassword().length() < 8)
            throw new IllegalArgumentException("PASSWORD_POLICY_VIOLATION");

        boolean ok = phoneAuthService.validateShortToken(req.getPhoneNumber(), req.getPhoneVerifyToken());
        if (!ok) throw new IllegalArgumentException("PHONE_NOT_VERIFIED");

        var u = userRepository.findByEmailIgnoreCase(req.getLoginId())
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (u.getProvider() != AuthProvider.LOCAL)
            throw new IllegalArgumentException("SOCIAL_ACCOUNT_NOT_SUPPORTED");

        if (!phoneMatches(u.getPhoneNumber(), req.getPhoneNumber()))
            throw new IllegalArgumentException("PHONE_MISMATCH");

        u.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(u);
        refreshTokenRepository.deleteByUserId(u.getId());
    }
}