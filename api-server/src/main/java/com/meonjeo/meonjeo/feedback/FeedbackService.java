package com.meonjeo.meonjeo.feedback;

// 필요한 import 구문들을 추가합니다.
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.feedback.dto.FeedbackCreateRequest;
import com.meonjeo.meonjeo.feedback.dto.FeedbackResponse;
import com.meonjeo.meonjeo.feedback.dto.FeedbackUpdateRequest;
import com.meonjeo.meonjeo.order.*;
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
    private final OrderRepository orderRepo;
    private final OrderItemRepository orderItemRepo;
    private final PointLedgerPort pointLedger;
    private final AuthSupport auth;
    private final OrderWindowService windowService;
    // JSON 파싱을 위해 ObjectMapper를 추가합니다.
    private final ObjectMapper objectMapper = new ObjectMapper();
    // User 정보를 가져오기 위해 UserRepository를 주입받습니다.
    private final UserRepository userRepo;

    /**
     * Feedback 엔티티를 FeedbackResponse DTO로 변환합니다. (단건 처리용)
     * 이 메서드는 사용자 정보를 포함하여 DTO를 생성합니다.
     */
    private FeedbackResponse toResponse(Feedback fb) {
        // User 정보를 찾아서 닉네임과 프로필 이미지를 가져옵니다.
        User author = userRepo.findById(fb.getUserId()).orElse(null);
        String nickname = (author != null) ? author.getNickname() : "알 수 없는 사용자";
        String profileImg = (author != null) ? author.getProfileImageUrl() : null;

        OrderItem item = orderItemRepo.findById(fb.getOrderItemId()).orElse(null);
        String productName = (item != null) ? item.getProductNameSnapshot() : "상품 정보 없음";

        // 옵션 정보를 JSON에서 읽어와 문자열로 만드는 로직
        String optionName = null;
        if (item != null && item.getOptionSnapshotJson() != null && !item.getOptionSnapshotJson().isBlank()) {
            try {
                Map<String, String> options = objectMapper.readValue(item.getOptionSnapshotJson(), new TypeReference<>() {});
                // 옵션이 여러 개일 경우 " / "로 이어붙입니다.
                optionName = String.join(" / ", options.values());
            } catch (Exception e) {
                optionName = "옵션 정보 오류"; // 파싱 실패 시
            }
        }

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
                fb.getScoresJson(), // ✅ 신버전 추가 필드 반영
                nickname,           // ✅ 작성자 닉네임 추가
                profileImg          // ✅ 작성자 프로필 이미지 URL 추가
        );
    }

    /**
     * Feedback 엔티티 목록을 FeedbackResponse DTO 목록으로 변환합니다. (N+1 문제 방지 최적화)
     * 여러 개의 피드백을 한 번에 처리할 때 사용합니다.
     */
    private List<FeedbackResponse> toResponseList(List<Feedback> feedbacks) {
        if (feedbacks.isEmpty()) {
            return List.of();
        }

        // 1. 필요한 ID들을 한 번에 추출합니다.
        List<Long> userIds = feedbacks.stream().map(Feedback::getUserId).distinct().toList();
        List<Long> itemIds = feedbacks.stream().map(Feedback::getOrderItemId).distinct().toList();

        // 2. ID 목록으로 User와 OrderItem 정보를 한 번의 쿼리로 가져옵니다.
        Map<Long, User> userMap = userRepo.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        Map<Long, OrderItem> itemMap = orderItemRepo.findAllById(itemIds).stream()
                .collect(Collectors.toMap(OrderItem::getId, i -> i));

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

            return new FeedbackResponse(
                    fb.getId(), fb.getOrderItemId(), fb.getProductId(), productName,
                    fb.getCreatedAt(), optionName, fb.getOverallScore(), fb.getContent(),
                    fb.getImagesJson(), fb.getAwardedPoint(), fb.getAwardedAt(),
                    fb.getScoresJson(), // ✅ 신버전 추가 필드 반영
                    nickname,
                    profileImg
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

        // 최신 배송완료 시각(교환 재배송 포함)
        var effOpt = windowService.effectiveDeliveredAt(o.getId());
        if (effOpt.isEmpty())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "NOT_DELIVERED");

        LocalDateTime eff = effOpt.get();
        LocalDateTime deadline = eff.plusDays(7);
        LocalDateTime now = LocalDateTime.now();

        // 윈도우 체크: eff <= now < deadline
        if (now.isBefore(eff) || !now.isBefore(deadline))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "FEEDBACK_WINDOW_CLOSED");

        // 정책: 수동 구매확정 이후만 피드백 가능
        if (o.getConfirmedAt() == null || o.getConfirmationType() != Order.ConfirmationType.MANUAL)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "NEED_MANUAL_CONFIRM_FIRST");

        // ✅ 상품 기준 1회만 작성 가능 (스키마 변경 없이 조인 검사)
        Long productId = item.getProductId();
        if (feedbackRepo.existsForUserAndProduct(uid, productId))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ALREADY_WRITTEN_FOR_PRODUCT");

        // 저장 (요청값 스냅샷 + deadlineAt)
        Feedback fb = feedbackRepo.save(Feedback.builder()
                .orderItemId(orderItemId)
                .userId(uid)
                .productId(item.getProductId()) // productId도 함께 저장
                .type(req.type())
                .overallScore(req.overallScore())
                .scoresJson(req.scoresJson())
                .content(req.content())
                .imagesJson(req.imagesJson())
                .deadlineAt(deadline) // 스냅샷
                .build());

        // 포인트 지급 (멱등키: feedback:orderItemId)
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

        // 마감 확인: deadlineAt 스냅샷이 없으면 재계산해서 보완
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

        // 내용/이미지 만 수정
        if (req.content() != null) fb.setContent(req.content());
        if (req.imagesJson() != null) fb.setImagesJson(req.imagesJson());

        feedbackRepo.save(fb);
        return toResponse(fb);
    }

    // === 목록: 내 피드백 ===
    @Transactional(readOnly = true)
    public Page<FeedbackResponse> listMyFeedbacks(Pageable pageable) {
        Long uid = auth.currentUserId();
        Page<Feedback> feedbackPage = feedbackRepo.findByUserIdAndRemovedFalseOrderByIdDesc(uid, pageable);
        List<FeedbackResponse> dtoList = toResponseList(feedbackPage.getContent());
        return new PageImpl<>(dtoList, pageable, feedbackPage.getTotalElements());
    }

    // === 목록: 상품 피드백 ===
    @Transactional(readOnly = true)
    public Page<FeedbackResponse> listByProduct(Long productId, Pageable pageable) {
        Page<Feedback> feedbackPage = feedbackRepo.pageByProduct(productId, pageable);
        List<FeedbackResponse> dtoList = toResponseList(feedbackPage.getContent());
        return new PageImpl<>(dtoList, pageable, feedbackPage.getTotalElements());
    }

    // === 관리자 삭제: 하드딜리트 ===
    @Transactional
    public void adminDeleteHard(Long feedbackId) {
        if (!feedbackRepo.existsById(feedbackId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "FEEDBACK_NOT_FOUND");
        }
        feedbackRepo.deleteById(feedbackId);
    }

    /**
     * 내 피드백 상세 조회 (본인 확인 포함)
     */
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
