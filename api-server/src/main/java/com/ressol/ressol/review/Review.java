package com.ressol.ressol.review;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews", indexes = {
        @Index(name = "idx_review_mission_user_status", columnList = "missionId,userId,status")
})
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Review {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false)
    private Long missionId;

    @Column(nullable=false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private ReviewStatus status;

    @Lob
    private String content;

    @Column(nullable=false)
    private Integer regenCount;

    private Integer charLimit;

    private LocalDateTime lastAutosaveAt;
    private LocalDateTime lastSnapshotAt;

    @Version
    private Long version;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist(){
        if (status == null) status = ReviewStatus.DRAFT;
        if (regenCount == null) regenCount = 0;
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void preUpdate(){ updatedAt = LocalDateTime.now(); }
}
