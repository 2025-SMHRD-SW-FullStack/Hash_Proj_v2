package com.ressol.ressol.proof;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name="receipts",
        uniqueConstraints=@UniqueConstraint(name="uk_receipt_hash", columnNames={"channel_id","receipt_hash"}),
        indexes={@Index(name="ix_receipt_app", columnList="application_id")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Receipt {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="application_id", nullable=false) private Long applicationId;
    @Column(name="channel_id",      nullable=false) private Long channelId;

    @Column(name="image_url", nullable=false, length=500) private String imageUrl;
    @Column(name="amount") private Integer amount;
    @Lob private String ocrText;

    @Column(name="receipt_hash", nullable=false, length=64) private String receiptHash; // sha-256(imageUrl 등)

    @CreationTimestamp private LocalDateTime createdAt;
}
