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

    // === 권한 ===
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // ROLE_ 프리픽스 필수 (hasRole("ADMIN") 과 매칭됨)
        Role role = (user.getRole() != null) ? user.getRole() : Role.USER;
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    // === 인증 기본 필드 ===
    @Override public String getUsername() { return user.getEmail(); }
    @Override public String getPassword() { return user.getPassword(); }

    // === 계정 상태 ===
    @Override public boolean isAccountNonExpired()   { return true; }
    @Override public boolean isAccountNonLocked()    { return true; }
    @Override public boolean isCredentialsNonExpired(){ return true; }
    @Override public boolean isEnabled()             { return user.isEnabled(); }

    // === 편의 ===
    public User getUser()   { return user; }
    public Long getUserId() { return user.getId(); }

    // ✅ 리플렉션/공용 가드 호환용 브리지 (AuthSupport의 getId() 호출 대응)
    public Long getId()     { return user.getId(); }
}
