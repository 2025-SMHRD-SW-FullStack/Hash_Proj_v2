package com.meonjeo.meonjeo.feedback.report;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name="feedback_reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FeedbackReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long feedbackId;         // 신고 대상
    private Long sellerId;           // 신고자(셀러)
    @Lob private String reason;      // 신고 사유

    @Enumerated(EnumType.STRING)
    private ReportStatus status;     // PENDING / APPROVED / REJECTED

    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private Long resolvedByAdminId;
    private String resolutionNote;

    @PrePersist void pre(){ if (createdAt == null) createdAt = LocalDateTime.now(); }
}
