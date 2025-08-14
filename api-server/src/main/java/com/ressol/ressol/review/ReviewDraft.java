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

    @Column(name="application_id", nullable=false) private Long applicationId;

    @Lob private String content;
    @Lob @Column(name="photos_json") private String photosJson; // ["url1","url2"]

    @UpdateTimestamp private LocalDateTime updatedAt;
}
