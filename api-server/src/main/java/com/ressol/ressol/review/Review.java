package com.ressol.ressol.review;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name="reviews",
        uniqueConstraints=@UniqueConstraint(name="uk_review_app", columnNames={"application_id"}),
        indexes={@Index(name="ix_review_status", columnList="status")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Review {
    public enum Status { SUBMITTED, APPROVED, REJECTED }

    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="application_id", nullable=false) private Long applicationId;
    @Column(name="user_id",        nullable=false) private Long userId;
    @Column(name="company_id",     nullable=false) private Long companyId;

    @Lob private String content;
    @Lob @Column(name="photos_json") private String photosJson;

    @Enumerated(EnumType.STRING) @Column(nullable=false)
    private Status status;

    @CreationTimestamp private LocalDateTime createdAt;
}
