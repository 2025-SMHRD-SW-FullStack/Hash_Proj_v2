package com.meonjeo.meonjeo.survey;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;


import java.time.LocalDateTime;


@Entity
@Table(name = "survey_templates")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class SurveyTemplate {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(nullable = false, length = 100)
    private String name;


    /** ELECTRONICS / COSMETICS / PLATFORM / MEALKIT / GENERAL */
    @Column(name = "product_category", nullable = false, length = 50)
    private String productCategory;


    @Column(nullable = false)
    private int version = 1;


    @Column(nullable = false)
    private boolean isActive = true;


    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime createdAt;
}