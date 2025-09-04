package com.meonjeo.meonjeo.analytics;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_daily_summaries",
        uniqueConstraints = @UniqueConstraint(name = "uq_ai_daily_product_date",
                columnNames = {"product_id","summary_date"}),
        indexes = {
                @Index(name = "idx_ai_daily_product", columnList = "product_id"),
                @Index(name = "idx_ai_daily_date", columnList = "summary_date")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AiDailySummary {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="product_id", nullable = false)
    private Long productId;

    @Column(name="seller_id", nullable = false)
    private Long sellerId;

    @Column(name="summary_date", nullable = false)
    private LocalDate summaryDate; // KST 기준 날짜

    @Lob @Column(name="headline_md", columnDefinition = "TEXT")
    private String headlineMd;

    @Lob @Column(name="key_points_json", columnDefinition = "MEDIUMTEXT")
    private String keyPointsJson;

    @Lob @Column(name="actions_json", columnDefinition = "MEDIUMTEXT")
    private String actionsJson;

    @Lob @Column(name="full_summary_md", columnDefinition = "LONGTEXT")
    private String fullSummaryMd;

    @Column(name="model", length = 64)
    private String model;

    @Lob @Column(name="inputs_snapshot_json", columnDefinition = "LONGTEXT")
    private String inputsSnapshotJson;

    @Column(name="created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
