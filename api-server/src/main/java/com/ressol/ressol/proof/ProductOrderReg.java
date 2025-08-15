package com.ressol.ressol.proof;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name="product_order_regs",
        uniqueConstraints=@UniqueConstraint(name="uk_order_hash", columnNames={"channel_id","order_no_hash"}),
        indexes={@Index(name="ix_order_app", columnList="application_id")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProductOrderReg {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="application_id", nullable=false) private Long applicationId;
    @Column(name="channel_id",      nullable=false) private Long channelId;

    @Column(name="order_no", nullable=false, length=100) private String orderNo;
    @Column(name="order_no_hash", nullable=false, length=64) private String orderNoHash; // sha-256 hex

    @CreationTimestamp private LocalDateTime createdAt;
}
