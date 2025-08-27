package com.meonjeo.meonjeo.feedback.report;

import com.meonjeo.meonjeo.feedback.Feedback;
import com.meonjeo.meonjeo.feedback.FeedbackRepository;
import com.meonjeo.meonjeo.feedback.report.dto.ReportCreateRequest;
import com.meonjeo.meonjeo.feedback.report.dto.ReportResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.meonjeo.meonjeo.security.AuthSupport;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class FeedbackReportService {
    private final FeedbackReportRepository reportRepo;
    private final FeedbackRepository feedbackRepo;
    private final AuthSupport auth;

    private Long currentSellerId(){ return auth.currentUserId(); }
    private Long currentAdminId(){ return auth.currentUserId(); }

    @Transactional
    public ReportResponse create(ReportCreateRequest req){
        feedbackRepo.findById(req.feedbackId()).orElseThrow();
        var r = reportRepo.save(FeedbackReport.builder()
                .feedbackId(req.feedbackId())
                .sellerId(currentSellerId())
                .reason(req.reason())
                .status(ReportStatus.PENDING).build());
        return toDto(r);
    }

    @Transactional
    public ReportResponse approve(Long reportId, String note){
        var r = reportRepo.findById(reportId).orElseThrow();
        if (r.getStatus() != ReportStatus.PENDING) return toDto(r);

        Feedback f = feedbackRepo.findById(r.getFeedbackId()).orElseThrow();
        f.setRemoved(true);
        f.setRemovedAt(LocalDateTime.now());
        f.setRemovedByAdminId(currentAdminId());
        f.setRemoveReason(note != null ? note : r.getReason());
        feedbackRepo.save(f);

        r.setStatus(ReportStatus.APPROVED);
        r.setResolvedAt(LocalDateTime.now());
        r.setResolvedByAdminId(currentAdminId());
        r.setResolutionNote(note);
        reportRepo.save(r);

        return toDto(r);
    }

    @Transactional
    public ReportResponse reject(Long reportId, String note){
        var r = reportRepo.findById(reportId).orElseThrow();
        if (r.getStatus() != ReportStatus.PENDING) return toDto(r);
        r.setStatus(ReportStatus.REJECTED);
        r.setResolvedAt(LocalDateTime.now());
        r.setResolvedByAdminId(currentAdminId());
        r.setResolutionNote(note);
        reportRepo.save(r);
        return toDto(r);
    }

    public static ReportResponse toDto(FeedbackReport r){
        return new ReportResponse(r.getId(), r.getFeedbackId(), r.getSellerId(), r.getReason(),
                r.getStatus(), r.getCreatedAt(), r.getResolvedAt(), r.getResolvedByAdminId(), r.getResolutionNote());
    }
}
