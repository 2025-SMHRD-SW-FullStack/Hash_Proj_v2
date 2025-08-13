package com.ressol.ressol.point;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "point_ledger",
        uniqueConstraints = {
                // 멱등성: 동일 사용자/유형/관련ID 중복 방지
                @UniqueConstraint(name = "uk_point_idem", columnNames = {"user_id", "type", "related_id"})
        },
        indexes = {
                @Index(name = "idx_point_user", columnList = "user_id"),
                @Index(name = "idx_point_user_type", columnList = "user_id,type")
        }
)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class PointLedger {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private long amount;                 // +적립 / -차감

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PointType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PointStatus status;

    @Column(name = "related_id")
    private Long relatedId;              // 같은 이벤트를 식별(게시글ID, 리뷰ID, 피추천인 유저ID 등)

    @Column(length = 200)
    private String memo;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
