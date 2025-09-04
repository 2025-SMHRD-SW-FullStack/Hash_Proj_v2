package com.meonjeo.meonjeo.survey;


import org.springframework.data.jpa.repository.JpaRepository;


import java.util.List;
import java.util.Optional;


public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, Long> {
    Optional<SurveyQuestion> findByCode(String code);

    // 문항 메타 일괄 로딩
    List<SurveyQuestion> findByIdIn(java.util.Collection<Long> ids);

}