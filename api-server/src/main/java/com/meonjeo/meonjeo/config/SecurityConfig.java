package com.meonjeo.meonjeo.config;

import com.meonjeo.meonjeo.auth.CustomUserDetailsService;
import com.meonjeo.meonjeo.auth.JwtAuthenticationFilter;
import com.meonjeo.meonjeo.auth.oauth2.CustomOAuth2SuccessHandler;
import com.meonjeo.meonjeo.auth.oauth2.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.core.env.Environment;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomUserDetailsService customUserDetailsService;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final CustomOAuth2SuccessHandler customOAuth2SuccessHandler;
    private final Environment env;

    private static final List<String> DEV_ORIGINS = List.of(
            "http://localhost:5173",
            "http://localhost:3000"
    );
    private static final List<String> PROD_ORIGINS = List.of(
            "https://meonjeo.com",
            "https://www.meonjeo.com",
            "https://dev.meonjeo.com",
            "http://hash-proj-v2.eba-ijnehrgn.ap-northeast-2.elasticbeanstalk.com/"
    );

    private List<String> resolveAllowedOrigins() {
        var profiles = Arrays.asList(env.getActiveProfiles());
        return profiles.contains("prod") ? PROD_ORIGINS : DEV_ORIGINS;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CSRF: 전역 비활성 + 필요시 특정 경로만 예외 처리 가능
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(json401EntryPoint())
                        .accessDeniedHandler(json403Handler())
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/error",
                                "/actuator/health",
                                "/swagger-ui.html", "/swagger-ui/**",
                                "/v3/api-docs", "/v3/api-docs/**",
                                "/swagger-resources/**", "/webjars/**",
                                "/healthz",

                                // 인증/문자 인증
                                "/api/auth/**",
                                "/api/sms/**",

                                // 공개: 상품/채널
                                "/api/products/**",
                                "/api/channels/**",

                                // OAuth2 엔드포인트
                                "/oauth2/**", "/login/oauth2/**",

                                // WebSocket handshake
                                "/ws-stomp/**",

                                // 결제 콜백
                                "/api/pay/**", "/api/payments/**"
                        ).permitAll()

                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/ads/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/ads/seller/**").hasAnyRole("SELLER","ADMIN")
                        .requestMatchers("/api/ads/bookings/**").hasAnyRole("SELLER","ADMIN")
                        .requestMatchers("/api/shipping/webhooks/**", "/api/shipping/events").permitAll()
                        .requestMatchers("/api/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ads/active/**").permitAll() // ✅ 광고 조회 공개
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(u -> u.userService(customOAuth2UserService))
                        .successHandler(customOAuth2SuccessHandler)
                        .failureUrl("/login?error=true")
                )
                .userDetailsService(customUserDetailsService)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(resolveAllowedOrigins());
        config.setAllowedHeaders(List.of(
                "Authorization", "Content-Type", "X-Requested-With",
                "Accept", "Origin"
        ));
        config.setExposedHeaders(List.of("Authorization", "Set-Cookie"));
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","PATCH","OPTIONS"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    public static PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private AuthenticationEntryPoint json401EntryPoint() {
        return (req, res, ex) -> {
            res.setStatus(401);
            res.setCharacterEncoding(StandardCharsets.UTF_8.name());
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write("{\"message\":\"Unauthorized\"}");
        };
    }

    private AccessDeniedHandler json403Handler() {
        return (req, res, ex) -> {
            res.setStatus(403);
            res.setCharacterEncoding(StandardCharsets.UTF_8.name());
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write("{\"message\":\"Forbidden\"}");
        };
    }
}
