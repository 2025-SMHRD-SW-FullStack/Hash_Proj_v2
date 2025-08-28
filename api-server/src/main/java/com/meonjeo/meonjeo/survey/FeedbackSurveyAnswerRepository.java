package com.meonjeo.meonjeo.survey;


import org.springframework.data.jpa.repository.JpaRepository;


import java.util.List;


public interface FeedbackSurveyAnswerRepository extends JpaRepository<FeedbackSurveyAnswer, Long> {
    List<FeedbackSurveyAnswer> findByFeedbackId(Long feedbackId);
}