package com.ressol.ressol.review;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_style_profiles",
        indexes = @Index(name = "idx_usp_user", columnList = "userId", unique = true))
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class UserStyleProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(nullable = false) private Long userId;
    private String toneLabel;

    @Lob private String styleTagsJson; // ["자연스러움","간결함"] 형태의 JSON 문자열
    @Lob private String systemPrompt;

    private Integer sampleCount;
    private LocalDateTime lastAnalyzedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist void p(){
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (sampleCount == null) sampleCount = 0;
        if (styleTagsJson == null) styleTagsJson = "[]";
    }
    @PreUpdate void u(){ updatedAt = LocalDateTime.now(); }
}
