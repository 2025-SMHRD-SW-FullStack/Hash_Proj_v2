package com.meonjeo.meonjeo.auth.oauth2;

import java.util.Map;

public class KakaoUserInfo extends OAuth2UserInfo {
    public KakaoUserInfo(Map<String, Object> attributes) { super(attributes); }

    public String getEmail() {
        Map<String, Object> acc = (Map<String, Object>) attributes.get("kakao_account");
        return acc != null ? (String) acc.get("email") : null;
    }
    public String getProviderId() { return String.valueOf(attributes.get("id")); }
    public String getName() {
        Map<String, Object> acc = (Map<String, Object>) attributes.get("kakao_account");
        Map<String, Object> profile = acc != null ? (Map<String, Object>) acc.get("profile") : null;
        return profile != null ? (String) profile.get("nickname") : null;
    }
    public String getNickname() { return getName(); }
}

