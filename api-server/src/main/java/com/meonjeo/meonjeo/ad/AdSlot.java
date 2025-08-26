package com.meonjeo.meonjeo.ad;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 광고 슬롯 엔터티.
 * (type, position, category)의 유니크 제약으로 하나의 실제 슬롯을 식별합니다.
 * 예) MAIN_ROLLING x position(1~10), CATEGORY_TOP x category x position(1~5)
 */
@Entity
@Table(name = "ad_slots",
        uniqueConstraints = @UniqueConstraint(name = "uk_slot", columnNames = {"type", "position", "category"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class AdSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("슬롯 ID")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Comment("슬롯 타입(MAIN_ROLLING|MAIN_SIDE|CATEGORY_TOP|ORDER_SUCCESS_BOTTOM 등)")
    private AdSlotType type;

    @Comment("슬롯 포지션(롤링:1~10, 사이드:1~3, 카테고리:1~5, 주문완료:1~5)")
    private Integer position;

    @Comment("카테고리(CATEGORY_TOP일 때만; 예: beauty/electronics/meal-kit)")
    private String category;
}
