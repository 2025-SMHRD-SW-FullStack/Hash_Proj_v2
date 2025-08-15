package com.ressol.ressol.review;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_generation_logs", indexes = {
        @Index(name = "idx_rgl_review", columnList = "reviewId")
})
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ReviewGenerationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false)
    private Long reviewId;

    @Column(nullable=false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private ReviewGenerationType type; // MANUAL / REGENERATE

    @Lob
    private String promptSnapshot;

    @Lob
    private String resultText;

    @Column(nullable=false)
    private Integer usedPoints;

    private LocalDateTime createdAt;

    @PrePersist
    void p(){
        if (usedPoints == null) usedPoints = 0;
        createdAt = LocalDateTime.now();
    }
}
