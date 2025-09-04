package com.meonjeo.meonjeo.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface FeedbackSurveyAnswerRepository extends JpaRepository<FeedbackSurveyAnswer, Long> {
    List<FeedbackSurveyAnswer> findByFeedbackId(Long feedbackId);

    // 전일(상품 단위) 척도 평균
    @Query("""
      select a.questionId, avg(a.valueInt)
      from FeedbackSurveyAnswer a
      join Feedback f on f.id = a.feedbackId
      where f.productId = :productId
        and f.createdAt >= :fromTs
        and f.createdAt <  :toTs
        and a.valueInt is not null
      group by a.questionId
    """)
    List<Object[]> avgScaleByQuestion(
            @Param("productId") Long productId,
            @Param("fromTs") java.time.LocalDateTime fromTs,
            @Param("toTs")   java.time.LocalDateTime toTs
    );

    // 전일(상품 단위) 선택형 버킷(옵션 코드 기준)
    // - SCALE은 위 avg에서 처리하므로 여기선 CHOICE/YES_NO/NA 만 빈도 집계
    @Query("""
      select a.questionId,
             upper(coalesce(o.valueCode, 'NA')),
             count(a)
      from FeedbackSurveyAnswer a
      left join SurveyOption o on o.id = a.optionId
      join Feedback f on f.id = a.feedbackId
      where f.productId = :productId
        and f.createdAt >= :fromTs
        and f.createdAt <  :toTs
      group by a.questionId, upper(coalesce(o.valueCode, 'NA'))
    """)
    List<Object[]> bucketsByQuestion(
            @Param("productId") Long productId,
            @Param("fromTs") java.time.LocalDateTime fromTs,
            @Param("toTs")   java.time.LocalDateTime toTs
    );
}
