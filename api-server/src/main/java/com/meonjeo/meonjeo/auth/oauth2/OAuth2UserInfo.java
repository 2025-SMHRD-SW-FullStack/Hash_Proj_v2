package com.meonjeo.meonjeo.auth.oauth2;

import java.time.LocalDate;
import java.util.Map;

public abstract class OAuth2UserInfo {
    protected Map<String, Object> attributes;

    public OAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    public abstract String getEmail();
    public abstract String getProviderId();
    public abstract String getName();

    /** 기본은 name = nickname */
    public String getNickname() { return getName(); }

    /** 기본은 미지원(네이버에서 오버라이드) */
    public LocalDate getBirthDate() { return null; }
}
