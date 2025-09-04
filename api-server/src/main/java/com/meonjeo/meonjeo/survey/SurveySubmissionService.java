package com.meonjeo.meonjeo.survey;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.order.OrderItem;
import com.meonjeo.meonjeo.order.OrderItemRepository;
import com.meonjeo.meonjeo.security.AuthSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class SurveySubmissionService {
    private final PreFeedbackSurveyRepository repo;
    private final OrderItemRepository orderItemRepo;
    private final AuthSupport auth;
    private final ObjectMapper om = new ObjectMapper();

    @Transactional
    public PreFeedbackSurvey save(Long orderItemId, Long productId, Integer overallScore, Object answersObj) {
        Long uid = auth.currentUserId();

        OrderItem oi = orderItemRepo.findById(orderItemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_ITEM_NOT_FOUND"));
        if (!Objects.equals(oi.getOrder().getUserId(), uid))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        if (!Objects.equals(oi.getProductId(), productId))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PRODUCT_MISMATCH");

        PreFeedbackSurvey row = repo.findByOrderItemId(orderItemId)
                .orElse(PreFeedbackSurvey.builder()
                        .orderItemId(orderItemId)
                        .userId(uid)
                        .productId(productId)
                        .build());

        if (overallScore != null)
            row.setOverallScore(Math.max(1, Math.min(5, overallScore)));

        try {
            if (answersObj != null)
                row.setAnswersJson(om.writeValueAsString(answersObj));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "INVALID_ANSWERS_JSON");
        }

        return repo.save(row);
    }
}
