package com.yjs_default.yjs_default.auth.oauth2;

import java.util.Map;

public abstract class OAuth2UserInfo {
    protected Map<String, Object> attributes;

    public OAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    public abstract String getEmail();
    public abstract String getProviderId();
    public abstract String getName();  // 구글에선 name, 카카오는 nickname 등
}
