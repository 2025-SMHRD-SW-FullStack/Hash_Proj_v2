package com.meonjeo.meonjeo.survey.dto;

import com.meonjeo.meonjeo.survey.QuestionType;
import java.util.List;

public record SurveyTemplateResponse(
        String category,
        List<Question> questions
) {
    public record Question(
            String code,        // 예: MEAL_TASTE
            String label,       // 예: 맛
            QuestionType type,  // SCALE_1_5 / CHOICE_ONE
            boolean allowNa,
            List<Option> options // SCALE은 null, CHOICE는 옵션 목록
    ) {}
    public record Option(String value, String label) {}
}
