package com.meonjeo.meonjeo.feedback;

import com.meonjeo.meonjeo.order.OrderItem;
import com.meonjeo.meonjeo.order.OrderItemRepository;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Primary
@RequiredArgsConstructor
public class DefaultFeedbackRewardPolicy implements FeedbackRewardPolicy {

    private final OrderItemRepository orderItemRepo;
    private final ProductRepository productRepo;

    @Override
    @Transactional(readOnly = true)
    public int feedbackPointOf(Long orderItemId) {
        OrderItem oi = orderItemRepo.findById(orderItemId).orElseThrow();
        Product p = productRepo.findById(oi.getProductId()).orElseThrow();
        int perProduct = Math.max(0, p.getFeedbackPoint());
        return perProduct; // ✅ 수량과 무관, 상품이 정한 고정 포인트 1회 지급
    }
}
