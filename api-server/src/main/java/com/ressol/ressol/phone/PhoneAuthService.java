package com.ressol.ressol.phone;

public interface PhoneAuthService {
    void sendCode(String phoneRaw);
    String verifyCodeAndIssueToken(String phoneRaw, String code); // 성공시 short JWT 반환
    boolean validateShortToken(String phoneRaw, String shortToken);
}
