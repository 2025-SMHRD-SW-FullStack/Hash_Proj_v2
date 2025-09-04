package com.meonjeo.meonjeo.survey;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pre_feedback_surveys",
        uniqueConstraints = @UniqueConstraint(name="uq_pre_survey_order_item", columnNames={"order_item_id"}),
        indexes = {
                @Index(name="idx_pre_survey_product", columnList="product_id"),
                @Index(name="idx_pre_survey_created", columnList="created_at")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PreFeedbackSurvey {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="order_item_id", nullable=false)
    private Long orderItemId;

    @Column(name="user_id", nullable=false)
    private Long userId;

    @Column(name="product_id", nullable=false)
    private Long productId;

    @Column(name="overall_score")
    private Integer overallScore; // 1~5

    @Lob
    @Column(name="answers_json", columnDefinition = "LONGTEXT")
    private String answersJson; // {"QCODE": value, ...}

    @Column(name="created_at", nullable=false)
    private LocalDateTime createdAt;

    @Column(name="updated_at", nullable=false)
    private LocalDateTime updatedAt;

    @PrePersist void pre() {
        var now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }
    @PreUpdate void upd() { updatedAt = LocalDateTime.now(); }
}
