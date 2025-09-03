package com.meonjeo.meonjeo.ad;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 광고 예약 엔터티.
 * 결제/집행 흐름의 중심이 되는 Aggregate Root.
 * 상태 흐름: RESERVED_UNPAID → ACTIVE → COMPLETED (또는 CANCELLED)
 */
@Entity
@Table(name = "ad_bookings")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class AdBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("예약 ID")
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "slot_id")
    @Comment("연결된 광고 슬롯")
    private AdSlot slot;

    @Comment("셀러 사용자 ID")
    private Long sellerId;

    @Comment("연결된 상품 ID")
    private Long productId;

    @Comment("배너 이미지 URL(MAIN_*에서 사용)")
    private String bannerImageUrl;

    @Comment("광고 제목(선택사항)")
    private String title;

    @Comment("광고 설명(선택사항)")
    private String description;

    @Comment("게재 시작일(포함)")
    private LocalDate startDate;

    @Comment("게재 종료일(포함)")
    private LocalDate endDate;

    @Comment("결제 금액(KRW)")
    private int price;

    @Enumerated(EnumType.STRING)
    @Comment("예약 상태(RESERVED_UNPAID|ACTIVE|COMPLETED|CANCELLED)")
    private AdBookingStatus status;

    @Comment("생성 시각")
    private LocalDateTime createdAt;

    @Comment("수정 시각")
    private LocalDateTime updatedAt;

    @PrePersist void pre() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = createdAt;
    }

    @PreUpdate  void upd() { updatedAt = LocalDateTime.now(); }
}
