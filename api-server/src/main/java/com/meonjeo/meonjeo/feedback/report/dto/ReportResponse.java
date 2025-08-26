package com.meonjeo.meonjeo.feedback.report.dto;

import com.meonjeo.meonjeo.feedback.report.ReportStatus;

public record ReportResponse(
        Long id, Long feedbackId, Long sellerId, String reason,
        ReportStatus status, java.time.LocalDateTime createdAt,
        java.time.LocalDateTime resolvedAt, Long resolvedByAdminId, String resolutionNote
) {}