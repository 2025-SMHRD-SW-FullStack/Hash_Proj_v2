package com.meonjeo.meonjeo.feedback.report;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.meonjeo.meonjeo.feedback.Feedback;

import io.lettuce.core.dynamic.annotation.Param;

public interface FeedbackReportRepository extends JpaRepository<FeedbackReport, Long> {
    Page<FeedbackReport> findByStatusOrderByIdAsc(ReportStatus status, Pageable pageable);
    Optional<FeedbackReport> findFirstByFeedbackIdAndSellerIdOrderByIdDesc(Long feedbackId, Long sellerId);
    List<FeedbackReport> findByFeedbackIdInOrderByIdAsc(Collection<Long> feedbackIds);

    @Query(
        value = """
            select f
            from Feedback f, OrderItem oi
            where oi.id = f.orderItemId
              and oi.sellerId = :sellerId
              and (f.removed = false or f.removed is null)
            order by f.id desc
        """,
                countQuery = """
            select count(f)
            from Feedback f, OrderItem oi
            where oi.id = f.orderItemId
              and oi.sellerId = :sellerId
              and (f.removed = false or f.removed is null)
        """
    )
    Page<Feedback> pageBySeller(@Param("sellerId") Long sellerId, Pageable pageable);

}
