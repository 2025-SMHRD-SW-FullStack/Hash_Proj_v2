package com.meonjeo.meonjeo.analytics;

import com.meonjeo.meonjeo.ai.AiSummaryClient;
import com.meonjeo.meonjeo.analytics.dto.ProductSnapshotResponse;
import com.meonjeo.meonjeo.feedback.FeedbackRepository;
import com.meonjeo.meonjeo.order.OrderItemRepository;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RealtimeStatsService {

    private final ProductRepository productRepo;
    private final OrderItemRepository orderItemRepo;
    private final FeedbackRepository feedbackRepo;
    private final AiSummaryClient ai;

    private static LocalDateTime startOfToday() {
        return LocalDate.now().atStartOfDay();
    }

    public ProductSnapshotResponse snapshot(Long productId) {
        Product p = productRepo.findById(productId).orElse(null);
        String name = p != null ? p.getName() : "(알 수 없음)";
        String cat  = p != null ? p.getCategory() : null;

        LocalDateTime from = startOfToday();

        long buyerSample = orderItemRepo.countPaidOrdersForProductSince(productId, from);
        Long sales = Optional.ofNullable(orderItemRepo.sumSalesAmountForProductSince(productId, from)).orElse(0L);

        Map<Integer, Long> ratingCounts = new TreeMap<>();
        double avg = 0.0;
        long total = 0;

        for (Object[] row : feedbackRepo.countRatingsByProductSince(productId, from)) {
            Integer score = (Integer) row[0];
            Long cnt = (Long) row[1];
            if (score != null && cnt != null) {
                ratingCounts.put(score, cnt);
                total += cnt;
                avg += score * cnt;
            }
        }
        Double average = (total > 0) ? (avg / total) : null;

        List<String> recentTexts = feedbackRepo
                .findRecentFeedbackTexts(productId, PageRequest.of(0, 8))
                .getContent();

        return ProductSnapshotResponse.builder()
                .productId(productId)
                .productName(name)
                .category(cat)
                .buyerSample((int) buyerSample)
                .ratingCountsToday(ratingCounts)
                .averageToday(average)
                .recentFeedbackTexts(recentTexts)
                .build();
    }

    public Map<String, Object> realtimeSummary(Long productId) {
        ProductSnapshotResponse s = snapshot(productId);

        // ai-server에 보낼 페이로드 구성
        Map<String, Object> stars = new LinkedHashMap<>();
        if (s.averageToday() != null) stars.put("avg", s.averageToday());
        for (Map.Entry<Integer, Long> e : s.ratingCountsToday().entrySet()) {
            stars.put(String.valueOf(e.getKey()), e.getValue());
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("productId", s.productId());
        payload.put("productName", s.productName());
        payload.put("category", s.category());
        payload.put("buyerSample", s.buyerSample());
        payload.put("stars", stars);
        payload.put("feedbackTexts", s.recentFeedbackTexts());
        payload.put("period", "TODAY");

        return ai.realtime(payload);
    }
}
