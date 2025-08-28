package com.meonjeo.meonjeo.survey;


import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name = "survey_questions")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class SurveyQuestion {
    public enum Type { SCALE_1_5, CHOICE_ONE, YES_NO }


    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(nullable = false, unique = true, length = 100)
    private String code; // e.g., ELEC_SETUP_EASE, COS_REPURCHASE


    @Column(nullable = false, length = 255)
    private String text;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;


    @Column(nullable = false)
    private boolean allowNa = false;
}