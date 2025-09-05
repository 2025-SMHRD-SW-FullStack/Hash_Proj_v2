package com.meonjeo.meonjeo.feedback.report;

import com.meonjeo.meonjeo.feedback.Feedback;
import com.meonjeo.meonjeo.feedback.FeedbackRepository;
import com.meonjeo.meonjeo.feedback.report.dto.ReportCreateRequest;
import com.meonjeo.meonjeo.feedback.report.dto.ReportResponse;
import com.meonjeo.meonjeo.order.OrderItem;
import com.meonjeo.meonjeo.order.OrderItemRepository;
import com.meonjeo.meonjeo.seller.SellerProfile;
import com.meonjeo.meonjeo.seller.SellerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.meonjeo.meonjeo.security.AuthSupport;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FeedbackReportService {
    private final FeedbackReportRepository reportRepo;
    private final FeedbackRepository feedbackRepo;
    private final AuthSupport auth;

    private final OrderItemRepository orderItemRepo;
    private final SellerProfileRepository sellerProfileRepo;

//    private Long currentSellerId(){ return auth.currentUserId(); }
    private Long currentAdminId(){ return auth.currentUserId(); }

    // 기존: return auth.currentUserId();
    private Long currentSellerId(){
        Long uid = auth.currentUserId();
        SellerProfile sp = sellerProfileRepo.findByUserId(uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_SELLER"));
        return sp.getId(); // ← SellerProfile.id (OrderItem.sellerId와 일치해야 함)
    }

    @Transactional
    public ReportResponse create(ReportCreateRequest req){
        if (req == null || req.feedbackId() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "FEEDBACK_ID_REQUIRED");
        final String reason = (req.reason() == null ? "" : req.reason().trim());
        if (reason.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "REASON_REQUIRED");

        final Feedback f = feedbackRepo.findById(req.feedbackId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FEEDBACK_NOT_FOUND"));
        final OrderItem oi = orderItemRepo.findById(f.getOrderItemId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_ITEM_NOT_FOUND"));

        // === 핵심: 실제 소유 키(ownerKey)는 DB에 저장된 값 그대로 사용 ===
        final Long ownerKey = oi.getSellerId();   // 현재 스키마에선 User.id

        // 로그인 사용자(userId)와 그에 대응하는 sellerProfileId(있으면)
        final Long userId = auth.currentUserId();
        final Long sellerProfileId = sellerProfileRepo.findByUserId(userId)
                .map(SellerProfile::getId).orElse(null);

        // 소유권 확인: ownerKey가 userId 또는 sellerProfileId와 일치하면 OK
        final boolean owns =
                Objects.equals(ownerKey, userId) ||
                        (sellerProfileId != null && Objects.equals(ownerKey, sellerProfileId));
        if (!owns) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_YOUR_FEEDBACK");
        }

        // 중복 신고(PENDING) 방지 — 저장도 ownerKey로 해야 이후 조회 매칭이 정확
        final Optional<FeedbackReport> last =
                reportRepo.findFirstByFeedbackIdAndSellerIdOrderByIdDesc(f.getId(), ownerKey);
        if (last.isPresent() && last.get().getStatus() == ReportStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ALREADY_PENDING");
        }

        final FeedbackReport r = reportRepo.save(FeedbackReport.builder()
                .feedbackId(f.getId())
                .sellerId(ownerKey)           // 💡 리스트/조회와 동일 축으로 저장
                .reason(reason)
                .status(ReportStatus.PENDING)
                .build());

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
