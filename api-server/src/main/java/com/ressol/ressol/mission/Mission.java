package com.ressol.ressol.mission;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "missions",
        indexes = {
                @Index(name="ix_mission_company", columnList="company_id"),
                @Index(name="ix_mission_channel", columnList="channel_id"),
                @Index(name="ix_mission_status_period", columnList="status,start_at,end_at")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Mission {

    public enum Type { STORE, PRODUCT }                    // 오프라인/온라인
    public enum PriceOption { FREE, PARTIAL, FULL }        // 무료/부분/전액
    public enum Status { DRAFT, PENDING, ACTIVE, PAUSED, REJECTED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="company_id", nullable=false)
    private Long companyId;     // Company.id

    @Column(name="channel_id", nullable=false)
    private Long channelId;     // CompanyChannel.id

    @Enumerated(EnumType.STRING) @Column(nullable=false)
    private Type type;

    @Column(nullable=false) private String title;
    @Column(columnDefinition="TEXT") private String description;

    @Enumerated(EnumType.STRING) @Column(name="price_option", nullable=false)
    private PriceOption priceOption;

    @Column(name="user_pay_amount") private Integer userPayAmount; // PARTIAL/FULL일 때만 사용(원)

    @Column(name="quota_total", nullable=false) private Integer quotaTotal;
    @Column(name="quota_daily", nullable=false) private Integer quotaDaily;

    @Column(name="start_at", nullable=false) private LocalDateTime startAt;
    @Column(name="end_at",   nullable=false) private LocalDateTime endAt;

    // 요구 조건
    @Column(name="required_keywords_cnt") private Integer requiredKeywordsCnt;
    @Column(name="required_photos_cnt")   private Integer requiredPhotosCnt;

    @Enumerated(EnumType.STRING) @Column(nullable=false)
    private Status status; // 기본 DRAFT → PENDING(사장 제출) → ACTIVE(관리자 승인)

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
