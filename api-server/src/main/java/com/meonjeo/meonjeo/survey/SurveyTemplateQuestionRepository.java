package com.meonjeo.meonjeo.survey;


import org.springframework.data.jpa.repository.JpaRepository;


import java.util.List;


public interface SurveyTemplateQuestionRepository extends JpaRepository<SurveyTemplateQuestion, SurveyTemplateQuestion.PK> {
    List<SurveyTemplateQuestion> findByTemplateIdOrderBySortOrderAsc(Long templateId);
}