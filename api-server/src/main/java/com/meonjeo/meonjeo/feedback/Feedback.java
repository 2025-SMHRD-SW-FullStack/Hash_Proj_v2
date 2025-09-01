package com.meonjeo.meonjeo.feedback;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name="feedbacks",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_feedback_user_product",
                columnNames = {"user_id","product_id"}
        ),
        indexes = {
                @Index(name="idx_feedback_user", columnList = "user_id"),
                @Index(name="idx_feedback_product", columnList = "product_id")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Feedback {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="order_item_id", nullable=false)
    private Long orderItemId;

    @Column(name="user_id", nullable=false)
    private Long userId;

    // ✅ 추가: 상품 기준 1회 제한을 위해 스냅샷 저장
    @Column(name="product_id", nullable=false)
    private Long productId;

    /** 사용자가 선택한 작성 유형 (MANUAL / AI) */
    @Enumerated(EnumType.STRING)
    private FeedbackType type;

    /** 전체 만족도 (1~5) */
    @Min(1) @Max(5)
    private int overallScore;

    /** 세부 점수/설문 응답 JSON (프론트 전송 값 그대로 스냅샷) */
    @Lob
    private String scoresJson;

    /** 자유 후기 본문 */
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String content;

    /** 업로드 완료된 이미지 URL 리스트 JSON */
    @Lob
    private String imagesJson;

    /** 생성/수정/마감 시각 */
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** “최신 배송완료 + 7일” 기준으로 계산된 피드백 마감 시각 스냅샷 */
    private LocalDateTime deadlineAt;

    /** 관리자 삭제 관련 */
    private boolean removed;
    private LocalDateTime removedAt;
    private Long removedByAdminId;
    private String removeReason;

    /** 포인트 지급 내역 (null=미지급) */
    private Integer awardedPoint;
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
