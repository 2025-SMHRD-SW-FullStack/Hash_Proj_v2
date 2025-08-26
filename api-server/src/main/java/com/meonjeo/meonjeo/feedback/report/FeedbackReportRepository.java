package com.meonjeo.meonjeo.feedback.report;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackReportRepository extends JpaRepository<FeedbackReport, Long> {
    Page<FeedbackReport> findByStatusOrderByIdAsc(ReportStatus status, Pageable pageable);
}
