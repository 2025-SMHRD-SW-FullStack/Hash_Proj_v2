package com.meonjeo.meonjeo.feedback;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name="feedbacks",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_feedback_item_user",
                columnNames = {"order_item_id","user_id"}
        )
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Feedback {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name="order_item_id", nullable=false) private Long orderItemId;
    @Column(name="user_id", nullable=false) private Long userId;
    @Enumerated(EnumType.STRING) private FeedbackType type; // MANUAL/AI
    @Min(1) @Max(5) private int overallScore;
    @Lob private String scoresJson;
    @Lob private String content;
    @Lob private String imagesJson;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deadlineAt; // 배송완료~D+7

    private boolean removed;
    private LocalDateTime removedAt;
    private Long removedByAdminId;
    private String removeReason;

    private Integer awardedPoint; // null=미지급
    private LocalDateTime awardedAt;

    @PrePersist void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }
    @PreUpdate void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

