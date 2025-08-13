package com.ressol.ressol.auth;

import com.ressol.ressol.user.Role;
import com.ressol.ressol.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@RequiredArgsConstructor
public class CustomUserDetails implements UserDetails {

    private final User user;

    @Override
    public String getUsername() {
        // 로그인 식별자
        return user.getEmail();
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // ⭐ ROLE_ 매핑 (기본 USER)
        Role role = user.getRole() != null ? user.getRole() : Role.USER;
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() {
        // 활성화 플래그. (리쏠: email/phone 인증과 별개로 운영에서 계정 disable 시 이 값만 false)
        return user.isEnabled();
    }

    public User getUser() { return user; }

    public Long getUserId() { return user.getId(); }
}
