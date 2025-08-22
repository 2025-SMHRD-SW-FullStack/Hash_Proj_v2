package com.meonjeo.meonjeo.mission;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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

    // --- [AI 생성/검수용 확장 필드] ---
    @Column(name = "product_name")
    private String productName; // 메뉴/상품명 (예: "남성용 스테인리스 오토매틱 시계")

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "required_keywords", columnDefinition = "json")
    private List<String> requiredKeywords; // ["가성비","빠른배송",...]

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "forbid_words", columnDefinition = "json")
    private List<String> forbidWords; // ["최고","개쩐다",...]

    @Column(name = "min_text_chars")
    private Integer minTextChars; // 최소 글자수(검수 기준)

    @Column(name = "allow_emoji", nullable = false)
    @Builder.Default
    private boolean allowEmoji = true;

    @Column(name = "allow_hashtags", nullable = false)
    @Builder.Default
    private boolean allowHashtags = true;

    @Lob
    @Column(name = "instructions")
    private String instructions; // "가격 대비 장점을 먼저, 단점은 과장 없이" 등

    @Column(name = "desired_length")
    private Integer desiredLength; // 생성 힌트(플랫폼 기본 덮어쓰기)

    @Column(name = "tone_label", length = 50)
    private String toneLabel; // 예: "친근한 정보형"

    @Lob
    @Column(name = "system_prompt")
    private String systemPrompt; // 미션별 LLM 시스템프롬프트(선택)

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "meta", columnDefinition = "json")
    private Map<String, Object> meta; // { "price":{list:...,paid:...,coupon:...}, "specs":[...], "pros":[...], "cons":[...] }


}
