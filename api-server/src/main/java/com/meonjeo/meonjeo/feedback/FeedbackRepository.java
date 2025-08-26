package com.meonjeo.meonjeo.feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    Optional<Feedback> findByOrderItemIdAndUserId(Long orderItemId, Long userId);
}
