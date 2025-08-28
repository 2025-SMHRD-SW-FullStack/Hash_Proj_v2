package com.meonjeo.meonjeo.survey;


import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name = "survey_options",
        uniqueConstraints = @UniqueConstraint(name = "uq_q_val", columnNames = {"question_id","value_code"}))
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class SurveyOption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(name = "question_id", nullable = false)
    private Long questionId;


    @Column(name = "value_code", nullable = false, length = 50)
    private String valueCode; // e.g., VERY_LOW / LOW / MID / HIGH / VERY_HIGH / NA


    @Column(nullable = false, length = 100)
    private String label;


    @Column(nullable = false)
    private int sortOrder = 0;


    @Column(nullable = false)
    private boolean isNa = false;
}