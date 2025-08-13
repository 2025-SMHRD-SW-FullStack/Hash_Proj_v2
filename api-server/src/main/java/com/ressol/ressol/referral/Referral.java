package com.ressol.ressol.referral;

import com.ressol.ressol.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "referral",
        uniqueConstraints = @UniqueConstraint(name = "uk_referee_once", columnNames = "referee_id"),
        indexes = {
                @Index(name = "idx_referral_referrer", columnList = "referrer_id"),
                @Index(name = "idx_referral_status", columnList = "status")
        })
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Referral {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 추천한 사람
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referrer_id", nullable = false)
    private User referrer;

    // 추천 받은 사람(한 번만 가능) — unique(referee_id)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "referee_id", nullable = false, unique = true)
    private User referee;

    // 당시 사용한 코드(감사/검증용)
    @Column(name = "used_code", nullable = false, length = 16)
    private String usedCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status; // PENDING, CONFIRMED, CANCELED, REJECTED (주로 PENDING/CONFIRMED 사용할 듯)

    @Column(length = 50)
    private String campaign; // 선택: 채널/캠페인 태그

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private LocalDateTime confirmedAt;

    public enum Status { PENDING, CONFIRMED, CANCELED, REJECTED }
}
