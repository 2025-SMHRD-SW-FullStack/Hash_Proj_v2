package com.meonjeo.meonjeo.auth.oauth2;

import java.util.Map;

public class GoogleUserInfo extends OAuth2UserInfo {
    public GoogleUserInfo(Map<String, Object> attributes) { super(attributes); }
    public String getEmail() { return (String) attributes.get("email"); }
    public String getProviderId() { return (String) attributes.get("sub"); }
    public String getName() { return (String) attributes.get("name"); }
    public String getNickname() { return (String) attributes.getOrDefault("name", "google_user"); }
}
