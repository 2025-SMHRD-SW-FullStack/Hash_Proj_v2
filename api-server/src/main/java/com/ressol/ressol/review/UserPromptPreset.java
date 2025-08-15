package com.ressol.ressol.review;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name="user_prompt_presets",
        indexes=@Index(name="idx_user_platform", columnList="userId,platform"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class UserPromptPreset {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private Long userId;
    private String platform;                // NAVER_STORE 등(선택)
    @Lob @Column(nullable=false) private String prompt;
    private Integer useCount;
    private LocalDateTime lastUsedAt;
    private LocalDateTime createdAt;

    @PrePersist void p(){
        if(createdAt==null) createdAt=LocalDateTime.now();
        if(useCount==null) useCount=0;
    }
}
