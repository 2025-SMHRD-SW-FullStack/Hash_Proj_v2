package com.meonjeo.meonjeo.feedback.report;

import com.meonjeo.meonjeo.feedback.report.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@Tag(name="피드백 신고")
@RestController @RequiredArgsConstructor
public class FeedbackReportController {

    private final FeedbackReportService service;
    private final FeedbackReportRepository repo;

    // ===== 셀러 =====

    @Operation(summary="피드백 신고(셀러)")
    @PostMapping("/api/seller/feedbacks/report")
    public ReportResponse report(@RequestBody @Valid ReportCreateRequest req){
        return service.create(req);
    }

    // ===== 관리자 =====

    @Operation(summary="[관리자] 신고 대기 목록")
    @GetMapping("/api/admin/feedback-reports")
    public Page<ReportResponse> listPending(@RequestParam(defaultValue="0") int page,
                                            @RequestParam(defaultValue="20") int size,
                                            @RequestParam(defaultValue="PENDING") ReportStatus status){
        var pageable = PageRequest.of(Math.max(0,page), Math.min(100,size));
        return repo.findByStatusOrderByIdAsc(status, pageable).map(FeedbackReportService::toDto);
    }

    @Operation(summary="[관리자] 신고 승인(피드백 삭제 처리)")
    @PostMapping("/api/admin/feedback-reports/{id}/approve")
    public ReportResponse approve(@PathVariable Long id, @RequestParam(required=false) String note){
        return service.approve(id, note);
    }

    @Operation(summary="[관리자] 신고 반려")
    @PostMapping("/api/admin/feedback-reports/{id}/reject")
    public ReportResponse reject(@PathVariable Long id, @RequestParam(required=false) String note){
        return service.reject(id, note);
    }
}
