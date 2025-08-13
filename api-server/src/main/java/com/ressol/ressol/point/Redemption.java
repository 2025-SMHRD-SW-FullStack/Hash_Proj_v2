package com.ressol.ressol.point;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "point_redemption",
        indexes = @Index(name = "idx_redemption_user", columnList = "user_id"))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Redemption {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private long amount;                   // 차감된 포인트(5000/10000/30000)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RedemptionStatus status;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime fulfilledAt;     // 발송 처리 시각
    private Long fulfilledBy;              // 처리자(SUPERADMIN) id (선택)

    @Column(length = 100)
    private String channel;                // 예: '문화상품권', '카카오기프티콘' 등 (선택)

    @Column(length = 200)
    private String note;                   // 메모(선택)
}
