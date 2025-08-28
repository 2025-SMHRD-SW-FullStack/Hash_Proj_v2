package com.meonjeo.meonjeo.survey;


import org.springframework.data.jpa.repository.JpaRepository;


import java.util.List;
import java.util.Optional;


public interface SurveyTemplateRepository extends JpaRepository<SurveyTemplate, Long> {
    Optional<SurveyTemplate> findFirstByProductCategoryAndIsActiveOrderByVersionDesc(String productCategory, boolean active);
    List<SurveyTemplate> findByIsActiveTrue();
}