package com.ressol.ressol.merchant;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "company_channels",
        uniqueConstraints = {
                @UniqueConstraint(name="uk_channel_platform_ext", columnNames={"company_id","platform","external_id"})
        },
        indexes = {
                @Index(name="ix_channel_company", columnList="company_id"),
                @Index(name="ix_channel_type", columnList="type"),
                @Index(name="ix_channel_active", columnList="active")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CompanyChannel {

    public enum Type { OFFLINE, ONLINE }
    public enum Platform { NONE, NAVER, COUPANG, SMARTSTORE, BRANDMALL, ETC }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="company_id", nullable=false)
    private Long companyId; // Company.id (권한/검증은 서비스에서)

    @Enumerated(EnumType.STRING) @Column(nullable=false)
    private Type type; // OFFLINE=지점, ONLINE=스토어

    @Column(nullable=false)
    private String displayName; // 지점명/스토어명

    // OFFLINE 전용
    private String address;
    private String contact;
    private String openingHours;

    // ONLINE 전용
    @Enumerated(EnumType.STRING) @Column(nullable=false)
    private Platform platform;   // ONLINE이면 NAVER/COUPANG 등, OFFLINE이면 NONE
    @Column(name="external_id")
    private String externalId;   // 스토어ID/셀러ID 등 (없으면 null)
    private String url;

    @Column(nullable=false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
