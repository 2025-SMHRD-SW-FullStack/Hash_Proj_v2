package com.meonjeo.meonjeo.survey;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;


import java.time.LocalDateTime;


@Entity
@Table(name = "feedback_survey_answers",
        uniqueConstraints = @UniqueConstraint(name = "uq_fb_q", columnNames = {"feedback_id","question_id"}))
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class FeedbackSurveyAnswer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(name = "feedback_id", nullable = false)
    private Long feedbackId;


    @Column(name = "question_id", nullable = false)
    private Long questionId;


    @Column(name = "option_id")
    private Long optionId; // CHOICE_ONE / YES_NO / NA의 경우


    @Column(name = "value_int")
    private Integer valueInt; // SCALE_1_5 (1~5), allowNa면 NULL 가능


    @Column(name = "value_text", length = 255)
    private String valueText;


    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime createdAt;
}