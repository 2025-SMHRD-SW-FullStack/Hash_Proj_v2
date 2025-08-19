// src/main/java/com/ressol/ressol/review/ReviewDraft.java
package com.ressol.ressol.review;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name="review_drafts",
        uniqueConstraints=@UniqueConstraint(name="uk_draft_app", columnNames={"application_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReviewDraft {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="application_id", nullable=false)
    private Long applicationId;

    // ✅ 신규: 키워드 배열(JSON 문자열로 저장)
    @Lob
    @Column(name="keywords_json")
    private String keywordsJson; // ["분위기좋음","친절","주차쉬움"]

    @Lob
    private String content;

    @Lob
    @Column(name="photos_json")
    private String photosJson; // ["url1","url2"]

    @Column(name="review_url", length = 500)   // ✅ 네이버 리뷰 URL
    private String reviewUrl;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
