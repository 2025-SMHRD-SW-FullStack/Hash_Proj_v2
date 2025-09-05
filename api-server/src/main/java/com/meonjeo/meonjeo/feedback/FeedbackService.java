package com.meonjeo.meonjeo.feedback;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.feedback.dto.FeedbackCreateRequest;
import com.meonjeo.meonjeo.feedback.dto.FeedbackResponse;
import com.meonjeo.meonjeo.feedback.dto.FeedbackUpdateRequest;
import com.meonjeo.meonjeo.order.*;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepo;
    private final OrderItemRepository orderItemRepo;
    private final PointLedgerPort pointLedger;
    private final AuthSupport auth;
    private final OrderWindowService windowService;
    private final UserRepository userRepo;
    private final ProductRepository productRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        var effOpt = windowService.effectiveDeliveredAt(o.getId());
        if (effOpt.isEmpty())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "NOT_DELIVERED");

        LocalDateTime eff = effOpt.get();
        LocalDateTime deadline = eff.plusDays(7);
        LocalDateTime now = LocalDateTime.now();

        if (now.isBefore(eff) || !now.isBefore(deadline))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "FEEDBACK_WINDOW_CLOSED");

        if (o.getConfirmedAt() == null || o.getConfirmationType() != Order.ConfirmationType.MANUAL)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "NEED_MANUAL_CONFIRM_FIRST");

        Long productId = item.getProductId();
        if (feedbackRepo.existsForUserAndProduct(uid, productId))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ALREADY_WRITTEN_FOR_PRODUCT");

        Feedback fb = feedbackRepo.save(Feedback.builder()
                .orderItemId(orderItemId)
                .userId(uid)
                .productId(item.getProductId())
                .type(req.type())
                .overallScore(req.overallScore())
                .scoresJson(req.scoresJson())
                .content(req.content())
                .imagesJson(req.imagesJson())
                .deadlineAt(deadline)
                .build());

        Integer awardedPoint = null;
        LocalDateTime awardedAt = null;
        int reward = Math.max(0, item.getFeedbackPointSnapshot());
        if (reward > 0) {
            pointLedger.accrue(uid, reward, "FEEDBACK_REWARD", "feedback:" + orderItemId);
            awardedPoint = reward;
            awardedAt = now;
            fb.setAwardedPoint(awardedPoint);
            fb.setAwardedAt(awardedAt);
            feedbackRepo.save(fb);
        }

        return toResponse(fb);
    }

    @Transactional
    public FeedbackResponse update(Long feedbackId, FeedbackUpdateRequest req) {
        Long uid = auth.currentUserId();
        Feedback fb = feedbackRepo.findById(feedbackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FEEDBACK_NOT_FOUND"));

        if (!Objects.equals(fb.getUserId(), uid))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        if (fb.isRemoved())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "REMOVED");

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime deadline = fb.getDeadlineAt();
        if (deadline == null) {
            OrderItem item = orderItemRepo.findById(fb.getOrderItemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_ITEM_NOT_FOUND"));
            Order o = item.getOrder();
            var effOpt = windowService.effectiveDeliveredAt(o.getId());
            if (effOpt.isEmpty())
                throw new ResponseStatusException(HttpStatus.CONFLICT, "NOT_DELIVERED");
            deadline = effOpt.get().plusDays(7);
            fb.setDeadlineAt(deadline);
        }
        if (!now.isBefore(deadline))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "FEEDBACK_EDIT_WINDOW_CLOSED");

        if (req.content() != null) fb.setContent(req.content());
        if (req.imagesJson() != null) fb.setImagesJson(req.imagesJson());

        feedbackRepo.save(fb);
        return toResponse(fb);
    }

    @Transactional(readOnly = true)
    public Page<FeedbackResponse> listMyFeedbacks(Pageable pageable) {
        Long uid = auth.currentUserId();
        Page<Feedback> feedbackPage = feedbackRepo.findByUserIdAndRemovedFalseOrderByIdDesc(uid, pageable);
        List<FeedbackResponse> dtoList = toResponseList(feedbackPage.getContent());
        return new PageImpl<>(dtoList, pageable, feedbackPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<FeedbackResponse> listByProduct(Long productId, Pageable pageable) {
        Page<Feedback> feedbackPage = feedbackRepo.pageByProduct(productId, pageable);
        List<FeedbackResponse> dtoList = toResponseList(feedbackPage.getContent());
        return new PageImpl<>(dtoList, pageable, feedbackPage.getTotalElements());
    }

    @Transactional
    public void adminDeleteHard(Long feedbackId) {
        if (!feedbackRepo.existsById(feedbackId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "FEEDBACK_NOT_FOUND");
        }
        feedbackRepo.deleteById(feedbackId);
    }

    @Transactional(readOnly = true)
    public FeedbackResponse findByIdForUser(Long feedbackId) {
        Long uid = auth.currentUserId();
        Feedback fb = feedbackRepo.findById(feedbackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FEEDBACK_NOT_FOUND"));
        if (!Objects.equals(fb.getUserId(), uid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
        return toResponse(fb);
    }

    /**
     * Feedback 엔티티를 FeedbackResponse DTO로 변환합니다. (상세 조회용)
     */
    private FeedbackResponse toResponse(Feedback fb) {
        OrderItem mainOrderItem = orderItemRepo.findById(fb.getOrderItemId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_ITEM_NOT_FOUND"));

        Order order = mainOrderItem.getOrder();
        if (order == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Order not found for OrderItem");
        }

        List<OrderItem> relatedOrderItems = order.getItems().stream()
                .filter(item -> item.getProductId().equals(fb.getProductId()))
                .toList();

        List<String> individualOptionStrings = relatedOrderItems.stream()
                .map(OrderItem::getOptionSnapshotJson)
                .filter(json -> json != null && !json.isBlank())
                .map(json -> {
                    try {
                        Map<String, String> options = objectMapper.readValue(json, new TypeReference<>() {});
                        return options.entrySet().stream()
                                .map(entry -> entry.getKey().trim() + ": " + entry.getValue().trim())
                                .collect(Collectors.joining(" / "));
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();

        String combinedOptionsText = String.join("\n", individualOptionStrings);
        int optionsCount = individualOptionStrings.size();

        User author = userRepo.findById(fb.getUserId()).orElse(null);
        String authorNickname =
                (author != null && author.getNickname() != null && !author.getNickname().isBlank())
                        ? author.getNickname()
                        : (author != null && author.getEmail() != null
                        ? author.getEmail().split("@")[0]
                        : "알 수 없는 사용자");
        String authorProfileImageUrl = (author != null) ? author.getProfileImageUrl() : null;

        Product product = productRepo.findById(fb.getProductId()).orElse(null);
        String productImageUrl = (product != null) ? product.getThumbnailUrl() : null;

        Long me = auth.currentUserId(); // ✅ 현재 로그인 사용자 ID


        return new FeedbackResponse(
                fb.getId(),
                fb.getOrderItemId(),
                mainOrderItem.getOptionSnapshotJson(),
                fb.getProductId(),
                mainOrderItem.getProductNameSnapshot(),
                fb.getCreatedAt(),
                combinedOptionsText,
                optionsCount,
                fb.getOverallScore(),
                fb.getContent(),
                fb.getImagesJson(),
                fb.getAwardedPoint(),
                fb.getAwardedAt(),
                fb.getScoresJson(),
                authorNickname,
                authorProfileImageUrl,
                productImageUrl,
                Objects.equals(me, fb.getUserId())
        );
    }

    /**
     * Feedback 엔티티 목록을 FeedbackResponse DTO 목록으로 변환합니다. (목록 조회용)
     */
    private List<FeedbackResponse> toResponseList(List<Feedback> feedbacks) {
        if (feedbacks.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> userIds = feedbacks.stream().map(Feedback::getUserId).distinct().toList();
        List<Long> orderItemIds = feedbacks.stream().map(Feedback::getOrderItemId).distinct().toList();

        Map<Long, User> userMap = userRepo.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        Map<Long, OrderItem> orderItemMap = orderItemRepo.findAllByIdWithDetails(orderItemIds).stream()
                .collect(Collectors.toMap(OrderItem::getId, Function.identity()));

        List<Long> productIds = orderItemMap.values().stream()
                .map(OrderItem::getProductId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, Product> productMap = productRepo.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        // ✅ 현재 로그인 사용자 id (목록 변환에서도 한 번만 구해서 재사용)
            Long me = auth.currentUserId();

        return feedbacks.stream().map(fb -> {
            OrderItem mainOrderItem = orderItemMap.get(fb.getOrderItemId());
            if (mainOrderItem == null || mainOrderItem.getOrder() == null) {
                return null;
            }

            List<OrderItem> relatedOrderItems = mainOrderItem.getOrder().getItems().stream()
                    .filter(item -> item.getProductId().equals(fb.getProductId()))
                    .toList();

            List<String> individualOptionStrings = relatedOrderItems.stream()
                    .map(OrderItem::getOptionSnapshotJson)
                    .filter(json -> json != null && !json.isBlank())
                    .map(json -> {
                        try {
                            Map<String, String> options = objectMapper.readValue(json, new TypeReference<>() {});
                            return options.entrySet().stream()
                                    .map(entry -> entry.getKey().trim() + ": " + entry.getValue().trim())
                                    .collect(Collectors.joining(" / "));
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .filter(Objects::nonNull)
                    .toList();

            String combinedOptionsText = String.join("\n", individualOptionStrings);
            int optionsCount = individualOptionStrings.size();

            User author = userMap.get(fb.getUserId());
            String nickname = (author != null) ? author.getNickname() : "알 수 없는 사용자";
            String profileImg = (author != null) ? author.getProfileImageUrl() : null;

            Product product = productMap.get(mainOrderItem.getProductId());
            String productImageUrl = (product != null) ? product.getThumbnailUrl() : null;

            return new FeedbackResponse(
                    fb.getId(),
                    fb.getOrderItemId(),
                    mainOrderItem.getOptionSnapshotJson(),
                    fb.getProductId(),
                    mainOrderItem.getProductNameSnapshot(),
                    fb.getCreatedAt(),
                    combinedOptionsText,
                    optionsCount,
                    fb.getOverallScore(),
                    fb.getContent(),
                    fb.getImagesJson(),
                    fb.getAwardedPoint(),
                    fb.getAwardedAt(),
                    fb.getScoresJson(),
                    nickname,
                    profileImg,
                    productImageUrl,
                    Objects.equals(me, fb.getUserId())   // ✅ mine
            );
        }).filter(Objects::nonNull).collect(Collectors.toList());
    }
}