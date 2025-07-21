package com.yjs_default.yjs_default.user;

import com.yjs_default.yjs_default.auth.AuthProvider;
import com.yjs_default.yjs_default.company.Company;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"provider", "providerId"})
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Setter
    @Column(nullable = true, length = 255)
    private String email;

    // ✅ 실명 or 전체 이름 (소셜에서 넘어오는 값)
    @Setter
    @Column(nullable = false)
    private String name;

    // ✅ 닉네임 필수 (소셜 초기값 -> 실명)
    @Setter
    @Column(nullable = false)
    private String nickname;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider;

    @Column(nullable = false, length = 100)
    private String providerId;

    @Setter
    @Column(nullable = false)
    private boolean enabled = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    // ✅ 추가정보 입력용 필드들 (nullable = true, 소셜은 나중에 입력)
    @Setter
    @Column(nullable = true, length = 6)
    private String birth; // 6자리 YYMMDD

    @Setter
    @Column(nullable = true, length = 10)
    private String gender; // "M", "F" 등

    @Setter
    @Column(nullable = true, length = 20)
    private String phone;

    @Setter
    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JoinColumn(name = "company_id")
    private Company company;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
