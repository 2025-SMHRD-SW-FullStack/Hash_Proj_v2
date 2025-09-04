package com.meonjeo.meonjeo.seller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.feedback.Feedback;
import com.meonjeo.meonjeo.feedback.FeedbackRepository;
import com.meonjeo.meonjeo.feedback.report.FeedbackReport;
import com.meonjeo.meonjeo.feedback.report.FeedbackReportRepository;
import com.meonjeo.meonjeo.order.OrderItem;
import com.meonjeo.meonjeo.order.OrderItemRepository;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.seller.dto.SellerFeedbackDetailResponse;
import com.meonjeo.meonjeo.seller.dto.SellerFeedbackRow;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Tag(name = "셀러 피드백 목록")
@RestController
@RequestMapping("/api/seller/feedbacks")
@RequiredArgsConstructor
public class SellerFeedbackController {

    private final AuthSupport auth;
    private final FeedbackRepository feedbackRepo;
    private final FeedbackReportRepository reportRepo;
    private final OrderItemRepository orderItemRepo;
    private final ProductRepository productRepo;
    private final UserRepository userRepo;

    private static LocalDateTime plusDaysFloor(LocalDateTime base, int days) {
        if (base == null) return null;
        return base.toLocalDate().plusDays(days).atStartOfDay();
    }

    @Operation(summary = "셀러 피드백 목록 (페이지네이션)")
    @GetMapping
    public Page<SellerFeedbackRow> list(
            @RequestParam(required = false) String q,
            @ParameterObject @PageableDefault(size = 50, sort = "id", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        Long sellerId = auth.currentUserId();

        Page<Feedback> page = feedbackRepo.pageBySeller(sellerId, pageable);
        List<Feedback> feedbacks = page.getContent();

        // 연관 엔티티 일괄 로드
        Map<Long, OrderItem> itemMap = orderItemRepo.findAllById(
                feedbacks.stream().map(Feedback::getOrderItemId).collect(Collectors.toSet())
        ).stream().collect(Collectors.toMap(OrderItem::getId, x -> x));

        Set<Long> productIds = feedbacks.stream().map(Feedback::getProductId).collect(Collectors.toSet());
        Map<Long, Product> productMap = productRepo.findAllById(productIds)
                .stream().collect(Collectors.toMap(Product::getId, x -> x));

        Set<Long> userIds = feedbacks.stream().map(Feedback::getUserId).collect(Collectors.toSet());
        Map<Long, User> userMap = userRepo.findAllById(userIds)
                .stream().collect(Collectors.toMap(User::getId, x -> x));

        List<SellerFeedbackRow> rows = new ArrayList<>(feedbacks.size());
        for (Feedback f : feedbacks) {
            OrderItem oi = itemMap.get(f.getOrderItemId());
            var order = (oi == null ? null : oi.getOrder());
            Product p = productMap.get(f.getProductId());
            User u = userMap.get(f.getUserId());

            String orderUid = (order == null ? null : order.getOrderUid());
            LocalDateTime deliveredAt = (order == null ? null : order.getDeliveredAt());
            LocalDateTime deadlineAt = plusDaysFloor(deliveredAt, 7);

            String reportStatus = reportRepo
                    .findFirstByFeedbackIdAndSellerIdOrderByIdDesc(f.getId(), sellerId)
                    .map(r -> r.getStatus() == null ? null : r.getStatus().name())
                    .orElse(null);

            String productName = (p == null ? "(삭제됨)" : p.getName());
            String buyer = null;
            if (u != null && u.getNickname() != null && !u.getNickname().isBlank()) {
                buyer = u.getNickname();
            } else if (order != null && order.getReceiver() != null && !order.getReceiver().isBlank()) {
                buyer = order.getReceiver(); // 닉네임 없으면 수령인 표시
            } else {
                buyer = "-";
            }
            String content = f.getContent();
            String shortContent = (content == null || content.isBlank())
                    ? "-"
                    : (content.length() > 60 ? content.substring(0, 60) + "…" : content);

            SellerFeedbackRow row = new SellerFeedbackRow(
                    f.getId(),
                    orderUid,
                    (p == null ? "(삭제됨)" : p.getName()),
                    buyer,
                    f.getContent(),
                    f.getCreatedAt(),
                    deliveredAt,
                    deadlineAt,
                    reportStatus
            );
            rows.add(row);
        }


        // 간단 검색(q): 주문번호/구매자/상품명/내용
        if (q != null && !q.isBlank()) {
            String needle = q.trim().toLowerCase();
            rows = rows.stream().filter(r ->
                    (r.orderUid() != null && r.orderUid().toLowerCase().contains(needle)) ||
                            (r.buyer() != null && r.buyer().toLowerCase().contains(needle)) ||
                            (r.productName() != null && r.productName().toLowerCase().contains(needle)) ||
                            (r.feedbackContent() != null && r.feedbackContent().toLowerCase().contains(needle))
            ).toList();
        }

        return new PageImpl<>(rows, page.getPageable(), page.getTotalElements());
    }
    @Operation(summary = "셀러 피드백 상세 (상품명/구매자/상태/내용/이미지/작성일)")
    @GetMapping("/{feedbackId}")
    public SellerFeedbackDetailResponse detail(@PathVariable Long feedbackId) {
        Long sellerId = auth.currentUserId(); // 프로젝트 패턴 유지

        Feedback f = feedbackRepo.findById(feedbackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "FEEDBACK_NOT_FOUND"));

        // 내 소유(셀러) 확인: Feedback → OrderItem → sellerId
        OrderItem oi = orderItemRepo.findById(f.getOrderItemId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ORDER_ITEM_NOT_FOUND"));
        if (oi.getSellerId() == null || !oi.getSellerId().equals(sellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_YOUR_FEEDBACK");
        }

        // 주문/배송 관련 (LAZY여도 접근 시 로드됨)
        var order = oi.getOrder();
        String        orderUid    = (order == null ? null : order.getOrderUid());
        LocalDateTime deliveredAt = (order == null ? null : order.getDeliveredAt());
        LocalDateTime deadlineAt  = plusDaysFloor(deliveredAt, 7);

        // 상품명: 스냅샷 우선 → 원본 대체
        String productName;
        if (oi.getProductNameSnapshot() != null && !oi.getProductNameSnapshot().isBlank()) {
            productName = oi.getProductNameSnapshot();
        } else {
            var p = productRepo.findById(oi.getProductId()).orElse(null);
            productName = (p == null ? "(삭제됨)" : p.getName());
        }

        // 구매자: 닉네임 우선 → 수령인 대체
        var u = userRepo.findById(f.getUserId()).orElse(null);
        String buyer = (u != null && u.getNickname() != null && !u.getNickname().isBlank())
                ? u.getNickname()
                : (order != null && order.getReceiver() != null && !order.getReceiver().isBlank()
                ? order.getReceiver() : "-");

        // 신고 상태(최근 항목 1건)
        String reportStatus = reportRepo
                .findFirstByFeedbackIdAndSellerIdOrderByIdDesc(f.getId(), sellerId)
                .map(r -> r.getStatus() == null ? null : r.getStatus().name())
                .orElse(null);

        // 이미지 JSON → List<String>
        List<String> images = java.util.Collections.emptyList();
        String imagesJson = f.getImagesJson();
        if (imagesJson != null && !imagesJson.isBlank()) {
            try {
                images = new ObjectMapper().readValue(imagesJson, new TypeReference<List<String>>() {});
            } catch (Exception ignore) { /* malformed → 빈 목록 */ }
        }

        return new SellerFeedbackDetailResponse(
                f.getId(),
                orderUid,
                oi.getProductId(),
                productName,
                f.getUserId(),
                buyer,
                reportStatus,
                f.getContent(),
                images,
                f.getCreatedAt(),
                deliveredAt,
                deadlineAt
        );
    }
}
