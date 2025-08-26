package com.meonjeo.meonjeo.feedback;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name="feedbacks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Feedback {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long orderItemId;
    private Long userId;

    @Enumerated(EnumType.STRING)
    private FeedbackType type; // MANUAL/AI

    @Min(1) @Max(5) private int overallScore;

    @Lob private String scoresJson; // 카테고리별 점수 JSON
    @Lob private String content;
    @Lob private String imagesJson; // 업로드 후 URL 배열 JSON

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deadlineAt; // 배송완료~D+7

    private boolean removed; // 신고 삭제 반영
    private LocalDateTime removedAt;
    private Long removedByAdminId;
    private String removeReason;

    // 지급 이력
    private Integer awardedPoint; // null=미지급
    private LocalDateTime awardedAt;
}
