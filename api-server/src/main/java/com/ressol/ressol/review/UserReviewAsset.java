package com.ressol.ressol.review;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_review_assets", indexes = @Index(name = "idx_ura_user_analyzed", columnList = "userId, analyzed"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserReviewAsset {

    public enum AssetType { TEXT, IMAGE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AssetType assetType;

    @Lob
    private String textContent; // TEXT일 때 사용

    private String imageUrl;         // IMAGE일 때 사용

    @Column(nullable = false)
    private boolean analyzed;

    private LocalDateTime createdAt;

    @PrePersist
    void p(){ createdAt = LocalDateTime.now(); }
}
