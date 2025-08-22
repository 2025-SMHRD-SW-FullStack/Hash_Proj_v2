package com.meonjeo.meonjeo.point;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name="point_redemptions", indexes={@Index(name="ix_redemption_user_time", columnList="user_id,created_at")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PointRedemption {

    public enum Status { REQUESTED, APPROVED, REJECTED, CANCELED }

    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable=false) private Long userId;
    @Column(name="amount",  nullable=false) private Long amount;

    @Column(name="channel") private String channel; // 예: "gifticon"
    @Column(name="note")    private String note;

    @Enumerated(EnumType.STRING) @Column(nullable=false)
    private Status status;

    @CreationTimestamp @Column(name="created_at")
    private LocalDateTime createdAt;
}
