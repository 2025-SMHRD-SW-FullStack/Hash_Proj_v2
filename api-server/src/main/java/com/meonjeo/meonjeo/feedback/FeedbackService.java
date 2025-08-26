package com.meonjeo.meonjeo.feedback;

import com.meonjeo.meonjeo.feedback.dto.*;
import com.meonjeo.meonjeo.order.OrderItemRepository;
import com.meonjeo.meonjeo.order.PointLedgerPort;
import com.meonjeo.meonjeo.shipment.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class FeedbackService {
    private final FeedbackRepository repo;
    private final FeedbackRewardPolicy rewardPolicy; // 상품/주문아이템에서 포인트 조회
    private final PointLedgerPort pointLedger;
    private final OrderItemRepository orderItemRepo;
    private final ShipmentRepository shipmentRepo;

    private Long currentUserId(){ return 1L; }

    @Transactional
    public FeedbackResponse create(FeedbackCreateRequest req) {
        Long userId = currentUserId();

        // ⬇️ 이미지 5장 제한 (imagesJson = ["...","..."])
        int imageCount = 0;
        try {
            var arr = new com.fasterxml.jackson.databind.ObjectMapper().readTree(req.imagesJson());
            imageCount = arr.isArray() ? arr.size() : 0;
        } catch (Exception ignore) {}
        if (imageCount > 5) throw new IllegalArgumentException("이미지는 최대 5장까지 업로드 가능합니다.");

        // ⬇️ 배송완료 + D+7 윈도우 체크
        var oi = orderItemRepo.findById(req.orderItemId()).orElseThrow();
        var sh = shipmentRepo.findByOrderId(oi.getOrder().getId()).orElse(null);
        if (sh == null || sh.getDeliveredAt() == null) {
            throw new IllegalStateException("배송 완료 후에만 피드백을 작성할 수 있습니다.");
        }
        var now = java.time.LocalDateTime.now();
        if (now.isAfter(sh.getDeliveredAt().plusDays(7))) {
            throw new IllegalStateException("배송완료 후 7일 이내에만 작성/수정 가능합니다.");
        }

        // ⬇️ 이하 기존 로직(중복시 수정, 포인트 1회 지급) 유지
        var existing = repo.findByOrderItemIdAndUserId(req.orderItemId(), userId).orElse(null);
        Feedback f = (existing != null) ? existing : new Feedback();
        if (f.getId() == null) {
            f.setOrderItemId(req.orderItemId()); f.setUserId(userId);
            f.setCreatedAt(now);
            f.setDeadlineAt(sh.getDeliveredAt().plusDays(7));
        }
        f.setType(req.type()); f.setOverallScore(req.overallScore());
        f.setScoresJson(req.scoresJson()); f.setContent(req.content());
        f.setImagesJson(req.imagesJson()); f.setUpdatedAt(now);
        repo.save(f);

        if (f.getAwardedAt() == null) {
            int amount = rewardPolicy.feedbackPointOf(req.orderItemId());
            if (amount > 0) {
                pointLedger.accrue(userId, amount, "FEEDBACK_REWARD", "orderItem:"+req.orderItemId());
                f.setAwardedPoint(amount); f.setAwardedAt(now);
            }
        }
        return new FeedbackResponse(f.getId(), f.getOrderItemId(), f.getOverallScore(), f.getContent(),
                f.getImagesJson(), f.getAwardedPoint(), f.getAwardedAt());
    }
}
