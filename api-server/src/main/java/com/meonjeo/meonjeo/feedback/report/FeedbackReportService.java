package com.meonjeo.meonjeo.feedback.report;

import com.meonjeo.meonjeo.feedback.Feedback;
import com.meonjeo.meonjeo.feedback.FeedbackRepository;
import com.meonjeo.meonjeo.feedback.report.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class FeedbackReportService {
    private final FeedbackReportRepository reportRepo;
    private final FeedbackRepository feedbackRepo;

    private Long currentSellerId(){ return 100L; }  // TODO: Security에서 주입
    private Long currentAdminId(){ return 999L; }   // TODO: Security에서 주입

    @Transactional
    public ReportResponse create(ReportCreateRequest req){
        // 피드백 존재 확인
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

        // 1) 피드백 숨김 처리(soft delete)
        Feedback f = feedbackRepo.findById(r.getFeedbackId()).orElseThrow();
        f.setRemoved(true);
        f.setRemovedAt(LocalDateTime.now());
        f.setRemovedByAdminId(currentAdminId());
        f.setRemoveReason(note != null ? note : r.getReason());
        feedbackRepo.save(f);

        // 2) 리포트 결론
        r.setStatus(ReportStatus.APPROVED);
        r.setResolvedAt(LocalDateTime.now());
        r.setResolvedByAdminId(currentAdminId());
        r.setResolutionNote(note);
        reportRepo.save(r);

        // (선택) 포인트 회수는 현재 정책상 미적용 — 필요 시 ledger에 조정 엔트리 쓰면 됨
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
