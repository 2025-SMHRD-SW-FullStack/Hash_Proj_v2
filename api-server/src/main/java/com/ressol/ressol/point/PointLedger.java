// src/main/java/com/ressol/ressol/point/PointLedger.java
package com.ressol.ressol.point;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name="point_ledger", indexes={@Index(name="ix_ledger_user_time", columnList="user_id,created_at")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PointLedger {

    public enum Reason {
        REVIEW_APPROVED,
        MANUAL_CREDIT,
        REFERRAL_SIGNUP,   // 추천가입 보상
        REDEEM_REQUESTED   // 교환(차감) 신청
    }

    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable=false) private Long userId;

    // 차감은 음수 허용
    @Column(name="delta", nullable=false) private Long delta;

    @Enumerated(EnumType.STRING) @Column(nullable=false)
    private Reason reason;

    @Column(name="application_id") private Long applicationId;

    @CreationTimestamp @Column(name="created_at")
    private LocalDateTime createdAt;
}
