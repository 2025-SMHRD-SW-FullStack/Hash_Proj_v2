package com.meonjeo.meonjeo.survey;


import org.springframework.data.jpa.repository.JpaRepository;


import java.util.Optional;


public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, Long> {
    Optional<SurveyQuestion> findByCode(String code);
}