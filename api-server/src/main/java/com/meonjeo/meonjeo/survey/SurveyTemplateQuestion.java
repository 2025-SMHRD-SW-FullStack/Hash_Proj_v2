package com.meonjeo.meonjeo.survey;


import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name = "survey_template_questions")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
@IdClass(SurveyTemplateQuestion.PK.class)
public class SurveyTemplateQuestion {


    @Data
    public static class PK implements java.io.Serializable {
        private Long templateId;
        private Long questionId;
    }


    @Id
    @Column(name = "template_id")
    private Long templateId;


    @Id
    @Column(name = "question_id")
    private Long questionId;


    @Column(nullable = false)
    private int sortOrder = 0;


    @Column(nullable = false)
    private boolean required = false;
}