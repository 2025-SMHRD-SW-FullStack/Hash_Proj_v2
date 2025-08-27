// src/main/java/com/meonjeo/meonjeo/feedback/FeedbackService.java
package com.meonjeo.meonjeo.feedback;

import com.meonjeo.meonjeo.feedback.dto.FeedbackCreateRequest;
import com.meonjeo.meonjeo.feedback.dto.FeedbackResponse;
import com.meonjeo.meonjeo.order.Order;
import com.meonjeo.meonjeo.order.OrderItem;
import com.meonjeo.meonjeo.order.OrderItemRepository;
import com.meonjeo.meonjeo.order.OrderRepository;
import com.meonjeo.meonjeo.order.PointLedgerPort;
import com.meonjeo.meonjeo.security.AuthSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepo;
    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final PointLedgerPort pointLedger;
    private final AuthSupport auth;

    @Transactional
    public FeedbackResponse create(FeedbackCreateRequest req) {
        Long uid = auth.currentUserId();
        Long orderItemId = req.orderItemId();

        OrderItem item = orderItemRepo.findById(orderItemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_ITEM_NOT_FOUND"));

        Order o = item.getOrder();
        if (o == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "ORDER_MISSING");

        if (!Objects.equals(o.getUserId(), uid))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");

        if (o.getDeliveredAt() == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "NOT_DELIVERED");

        if (LocalDateTime.now().isAfter(o.getDeliveredAt().plusDays(7)))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "FEEDBACK_WINDOW_CLOSED");

        if (o.getConfirmedAt() == null || o.getConfirmationType() != Order.ConfirmationType.MANUAL)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "NEED_MANUAL_CONFIRM_FIRST");

        if (feedbackRepo.existsByOrderItemIdAndUserId(orderItemId, uid))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ALREADY_WRITTEN");

        Feedback fb = feedbackRepo.save(Feedback.builder()
                .orderItemId(orderItemId)
                .userId(uid)
                .content(req.content())
                .build());

        int reward = Math.max(0, item.getFeedbackPointSnapshot());
        if (reward > 0) {
            pointLedger.accrue(uid, reward, "FEEDBACK_REWARD", "feedback:" + orderItemId);
        }

        int newBalance = pointLedger.getBalance(uid); // 현재 포인트 잔액 조회 (Integer)
        LocalDateTime createdAt = (fb.getCreatedAt() != null) ? fb.getCreatedAt() : LocalDateTime.now();
        return new FeedbackResponse(
                fb.getId(), fb.getOrderItemId(), reward, fb.getContent(),
                "REWARDED", Integer.valueOf(newBalance), createdAt
        );
    }
}
