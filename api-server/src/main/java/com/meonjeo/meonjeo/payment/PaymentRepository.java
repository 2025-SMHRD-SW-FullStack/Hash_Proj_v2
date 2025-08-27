package com.meonjeo.meonjeo.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByPaymentKey(String paymentKey);

    // ★ 추가: 주문/광고 기준 최신 결제 한 건
    Optional<Payment> findFirstByOrderIdOrderByIdDesc(Long orderId);
    Optional<Payment> findFirstByAdBookingIdOrderByIdDesc(Long adBookingId);
}
