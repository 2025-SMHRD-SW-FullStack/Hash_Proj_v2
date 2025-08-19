package com.ressol.ressol.security;

import com.ressol.ressol.exception.NotFoundException;
import com.ressol.ressol.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Component
@RequiredArgsConstructor
public class AuthSupport {

    private final UserRepository userRepository;

    public Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) throw new IllegalStateException("No authentication");
        Object p = auth.getPrincipal();

        // 1) 커스텀 Principal에 getId()가 있으면 사용
        try {
            Method m = p.getClass().getMethod("getId");
            Object v = m.invoke(p);
            if (v instanceof Long id) return id;
            if (v instanceof Number n) return n.longValue();
        } catch (Exception ignore) {}

        // 2) Spring UserDetails면 username(email)로 조회
        if (p instanceof UserDetails ud) {
            String email = ud.getUsername();
            return userRepository.findByEmail(email)
                    .map(u -> u.getId())
                    .orElseThrow(() -> new NotFoundException("user not found by email"));
        }
        throw new IllegalStateException("Unsupported principal type: " + p.getClass().getName());
    }
}
