package com.ressol.ressol.review;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "review_draft_snapshots", indexes = {
        @Index(name = "idx_rds_review_created", columnList = "reviewId,createdAt")
})
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class ReviewDraftSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false)
    private Long reviewId;

    @Column(nullable=false)
    private Long userId;

    @Lob
    @Column(nullable=false)
    private String content;

    private Long versionAt;

    private LocalDateTime createdAt;

    @PrePersist
    void p(){ createdAt = LocalDateTime.now(); }
}
