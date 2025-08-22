package com.meonjeo.meonjeo.auth.oauth2;

import java.time.LocalDate;
import java.util.Map;

public class NaverUserInfo extends OAuth2UserInfo {

    @SuppressWarnings("unchecked")
    public NaverUserInfo(Map<String, Object> attributes) {
        super((Map<String, Object>) attributes.get("response"));
    }

    @Override
    public String getEmail() {
        return (String) attributes.get("email");
    }

    @Override
    public String getProviderId() {
        return String.valueOf(attributes.get("id"));
    }

    @Override
    public String getName() {
        return (String) attributes.get("name");
    }

    /** scope: birthyear("1994"), birthday("12-21") → LocalDate(1994-12-21) */
    @Override
    public LocalDate getBirthDate() {
        String year = (String) attributes.get("birthyear");   // "1994"
        String md   = (String) attributes.get("birthday");    // "12-21" (MM-DD)
        if (year == null || md == null) return null;
        String[] p = md.split("-");
        if (p.length != 2) return null;
        try {
            int y = Integer.parseInt(year);
            int m = Integer.parseInt(p[0]);
            int d = Integer.parseInt(p[1]);
            return LocalDate.of(y, m, d);
        } catch (Exception ignore) {
            return null;
        }
    }

    /** 네이버 닉네임 스코프를 안 받는다면 name을 닉네임으로 사용 */
    @Override
    public String getNickname() {
        Object nn = attributes.get("nickname");
        return nn != null ? nn.toString() : getName();
    }
}
