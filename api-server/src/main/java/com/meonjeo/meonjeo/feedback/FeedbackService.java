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
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

    /**
     * Feedback 엔티티를 FeedbackResponse DTO로 변환합니다. (상세 조회용)
     * 이 메서드는 productImageUrl이 필요 없는 상세 페이지용입니다.
     */
    private FeedbackResponse toResponse(Feedback fb) {
        OrderItem item = orderItemRepo.findById(fb.getOrderItemId()).orElse(null);
        String productName = (item != null) ? item.getProductNameSnapshot() : "상품 정보 없음";

        String optionName = null;
        if (item != null && item.getOptionSnapshotJson() != null && !item.getOptionSnapshotJson().isBlank()) {
            try {
                Map<String, String> options = objectMapper.readValue(item.getOptionSnapshotJson(), new TypeReference<>() {});
                optionName = String.join(" / ", options.values());
            } catch (Exception e) {
                optionName = "옵션 정보 오류";
            }
        }

        User author = userRepo.findById(fb.getUserId()).orElse(null);
        String authorNickname = (author != null) ? author.getNickname() : "알 수 없는 사용자";
        String authorProfileImageUrl = (author != null) ? author.getProfileImageUrl() : null;

        return new FeedbackResponse(
                fb.getId(),
                fb.getOrderItemId(),
                fb.getProductId(),
                productName,
                fb.getCreatedAt(),
                optionName,
                fb.getOverallScore(),
                fb.getContent(),
                fb.getImagesJson(),
                fb.getAwardedPoint(),
                fb.getAwardedAt(),
                fb.getScoresJson(),
                authorNickname,
                authorProfileImageUrl,
                null // 상세 페이지에서는 상품 이미지가 필요 없으므로 null
        );
    }

    /**
     * Feedback 엔티티 목록을 FeedbackResponse DTO 목록으로 변환합니다. (목록 조회용)
     * N+1 문제 방지를 위해 관련 엔티티들을 한 번에 조회하여 DTO를 생성합니다.
     */
    private List<FeedbackResponse> toResponseList(List<Feedback> feedbacks) {
        if (feedbacks.isEmpty()) {
            return List.of();
        }

        // 1. 필요한 ID들을 한 번에 추출합니다.
        List<Long> userIds = feedbacks.stream().map(Feedback::getUserId).distinct().toList();
        List<Long> itemIds = feedbacks.stream().map(Feedback::getOrderItemId).distinct().toList();
        List<Long> productIds = feedbacks.stream().map(Feedback::getProductId).filter(Objects::nonNull).distinct().toList();

        // 2. ID 목록으로 관련 엔티티 정보들을 한 번의 쿼리로 가져옵니다.
        Map<Long, User> userMap = userRepo.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<Long, OrderItem> itemMap = orderItemRepo.findAllById(itemIds).stream()
                .collect(Collectors.toMap(OrderItem::getId, i -> i));
        Map<Long, Product> productMap = productRepo.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        // 3. 가져온 정보들을 조합하여 DTO를 만듭니다.
        return feedbacks.stream().map(fb -> {
            User author = userMap.get(fb.getUserId());
            String nickname = (author != null) ? author.getNickname() : "알 수 없는 사용자";
            String profileImg = (author != null) ? author.getProfileImageUrl() : null;

            OrderItem item = itemMap.get(fb.getOrderItemId());
            String productName = (item != null) ? item.getProductNameSnapshot() : "상품 정보 없음";

            String optionName = null;
            if (item != null && item.getOptionSnapshotJson() != null && !item.getOptionSnapshotJson().isBlank()) {
                try {
                    Map<String, String> options = objectMapper.readValue(item.getOptionSnapshotJson(), new TypeReference<>() {});
                    optionName = String.join(" / ", options.values());
                } catch (Exception e) {
                    optionName = "옵션 정보 오류";
                }
            }

            Product product = (fb.getProductId() != null) ? productMap.get(fb.getProductId()) : null;
            String productImageUrl = (product != null) ? product.getMainImageUrl() : null;

            return new FeedbackResponse(
                    fb.getId(), fb.getOrderItemId(), fb.getProductId(), productName,
                    fb.getCreatedAt(), optionName, fb.getOverallScore(), fb.getContent(),
                    fb.getImagesJson(), fb.getAwardedPoint(), fb.getAwardedAt(),
                    fb.getScoresJson(),
                    nickname,
                    profileImg,
                    productImageUrl // ✅ 목록 조회에서는 상품 이미지를 포함합니다.
            );
        }).collect(Collectors.toList());
    }

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
}