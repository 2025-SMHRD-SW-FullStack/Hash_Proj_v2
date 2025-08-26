package com.meonjeo.meonjeo.point;

import com.meonjeo.meonjeo.point.dto.RedemptionStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name="point_redemption")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PointRedemption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false) private Long userId;
    @Column(nullable=false) private int amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false) private RedemptionStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime processedAt;

    @PrePersist void pre(){ if(createdAt == null) createdAt = LocalDateTime.now(); }
}
