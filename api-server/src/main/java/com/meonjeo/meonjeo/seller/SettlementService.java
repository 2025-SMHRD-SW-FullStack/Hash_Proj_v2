// src/main/java/com/meonjeo/meonjeo/seller/SettlementService.java
package com.meonjeo.meonjeo.seller;

import com.meonjeo.meonjeo.feedback.FeedbackRepository;
import com.meonjeo.meonjeo.order.Order;
import com.meonjeo.meonjeo.order.OrderRepository;
import com.meonjeo.meonjeo.order.OrderItem;
import com.meonjeo.meonjeo.seller.dto.SellerDailySettlementDto;
import com.meonjeo.meonjeo.seller.dto.SellerSettlementRow;
import com.meonjeo.meonjeo.security.AuthSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SettlementService {

    private final OrderRepository orderRepo;
    private final FeedbackRepository feedbackRepo;
    private final AuthSupport auth;

    private static long fee3pct(long amount) {
        return BigDecimal.valueOf(amount)
                .multiply(BigDecimal.valueOf(0.03))
                .setScale(0, java.math.RoundingMode.HALF_UP)
                .longValue();
    }

    /** 하루(00:00~다음날 00:00) 확정건 목록 */
    public List<SellerSettlementRow> listForDay(LocalDate day) {
        Long sellerId = auth.currentUserId();
        LocalDateTime from = day.atStartOfDay();
        LocalDateTime to   = day.plusDays(1).atStartOfDay();

        List<Order> orders = orderRepo.findConfirmedOrdersForSeller(sellerId, from, to);
        List<SellerSettlementRow> rows = new ArrayList<>();

        for (Order o : orders) {
            // 이 주문에서 '피드백이 실제로 작성된' 주문아이템 id 집합
            Set<Long> feedbackItemIds = new HashSet<>(feedbackRepo.findItemIdsWithFeedbackByOrderId(o.getId()));

            long itemTotal = 0L;
            long feedbackTotal = 0L;

            for (OrderItem it : o.getItems()) {
                if (!Objects.equals(it.getSellerId(), sellerId)) continue;

                long line = (long) it.getUnitPrice() * it.getQty();
                itemTotal += line;

                if (feedbackItemIds.contains(it.getId())) {
                    long fb = (long) it.getFeedbackPointSnapshot() * it.getQty();
                    feedbackTotal += fb;
                }
            }

            long platformFee = fee3pct(itemTotal);
            long payout = itemTotal - feedbackTotal - platformFee;

            rows.add(new SellerSettlementRow(
                    o.getId(),
                    o.getOrderUid(),
                    o.getConfirmedAt(),
                    itemTotal,
                    feedbackTotal,
                    platformFee,
                    payout,
                    !feedbackItemIds.isEmpty()
            ));
        }

        rows.sort(Comparator.comparing(SellerSettlementRow::confirmedAt).thenComparing(SellerSettlementRow::orderId));
        return rows;
    }

    /** 하루 요약 */
    public SellerDailySettlementDto summaryForDay(LocalDate day) {
        List<SellerSettlementRow> rows = listForDay(day);
        long ordersCount   = rows.size();
        long itemTotal     = rows.stream().mapToLong(SellerSettlementRow::itemTotal).sum();
        long feedbackTotal = rows.stream().mapToLong(SellerSettlementRow::feedbackTotal).sum();
        long platformFee   = rows.stream().mapToLong(SellerSettlementRow::platformFee).sum();
        long payoutTotal   = rows.stream().mapToLong(SellerSettlementRow::payout).sum();
        return new SellerDailySettlementDto(day, ordersCount, itemTotal, feedbackTotal, platformFee, payoutTotal);
    }
}
