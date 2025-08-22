package com.meonjeo.meonjeo.application;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name="mission_applications",
        uniqueConstraints=@UniqueConstraint(name="uk_app_user_mission", columnNames={"mission_id","user_id"}),
        indexes = {
                @Index(name="ix_app_mission", columnList="mission_id"),
                @Index(name="ix_app_user", columnList="user_id"),
                @Index(name="ix_app_status", columnList="status")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MissionApplication {
    public enum Status { APPLIED, CANCELED, CONFIRMED, REJECTED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="mission_id", nullable=false)
    private Long missionId;

    @Column(name="company_id", nullable=false)
    private Long companyId;   // denorm for 빠른 조회

    @Column(name="channel_id", nullable=false)
    private Long channelId;

    @Column(name="user_id", nullable=false)
    private Long userId;

    @Enumerated(EnumType.STRING) @Column(nullable=false)
    private Status status;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
