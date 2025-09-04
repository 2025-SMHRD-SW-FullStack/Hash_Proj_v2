package com.meonjeo.meonjeo.survey;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface PreFeedbackSurveyRepository extends JpaRepository<PreFeedbackSurvey, Long> {
    Optional<PreFeedbackSurvey> findByOrderItemId(Long orderItemId);

    @Query("""
      select s from PreFeedbackSurvey s
      where s.productId = :productId
        and s.createdAt >= :fromTs
        and s.createdAt <  :toTs
    """)
    List<PreFeedbackSurvey> findForProductAndPeriod(
            @Param("productId") Long productId,
            @Param("fromTs") LocalDateTime fromTs,
            @Param("toTs")   LocalDateTime toTs
    );
}
