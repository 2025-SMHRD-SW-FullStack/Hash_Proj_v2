package com.meonjeo.meonjeo.feedback;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "feedbacks",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_feedback_user_product",
                columnNames = {"user_id", "product_id"}
        ),
        indexes = {
                @Index(name = "idx_feedback_user", columnList = "user_id"),
                @Index(name = "idx_feedback_product", columnList = "product_id")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Feedback {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_item_id", nullable = false)
    private Long orderItemId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Enumerated(EnumType.STRING)
    private FeedbackType type;

    @Min(1) @Max(5)
    private int overallScore;

    @Lob
    @Column(name = "scores_json", columnDefinition = "MEDIUMTEXT")
    private String scoresJson;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String content;

    // ✅ 길이 명시 (MySQL: LONGTEXT)
    @Lob
    @Column(name = "images_json", columnDefinition = "LONGTEXT")
    private String imagesJson;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deadlineAt;

    private boolean removed;
    private LocalDateTime removedAt;
    private Long removedByAdminId;
    private String removeReason;

    private Integer awardedPoint;
    private LocalDateTime awardedAt;

    @PrePersist void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (imagesJson == null) imagesJson = "[]";   // 안전 기본값
        if (scoresJson == null) scoresJson = "{}";
    }
    @PreUpdate void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
