package com.meonjeo.meonjeo.point;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(name = "point_ledger",
        uniqueConstraints = @UniqueConstraint(name = "uk_point_ref", columnNames = {"user_id","reason","ref_key"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PointLedgerEntry {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable=false)
    private Long userId;

    @Comment("적립/차감 금액(+/-)")
    private int amount;

    @Comment("사유 코드 (ORDER_PAY, FEEDBACK_REWARD 등)")
    @Column(length=40, nullable=false)
    private String reason;

    @Comment("중복 방지용 참조 키 (예: order:123, orderItem:456)")
    @Column(name="ref_key", length=120, nullable=false)
    private String refKey;

    private LocalDateTime createdAt;

    @PrePersist
    void onCreate(){ if(createdAt == null) createdAt = LocalDateTime.now(); }
}
