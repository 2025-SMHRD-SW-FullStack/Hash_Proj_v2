package com.meonjeo.meonjeo.ad;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 하우스(플랫폼) 광고 배너 URL을 순환 제공.
 * 실제 운영에서는 yml로 주입하거나 DB에서 관리하도록 교체하면 됨.
 */
@Component
public class HouseAdProvider {
    private final List<String> rolling = List.of(
            "/static/ads/house/main-rolling-1.png",
            "/static/ads/house/main-rolling-2.png",
            "/static/ads/house/main-rolling-3.png"
    );
    private final List<String> side = List.of(
            "/static/ads/house/main-side-1.png",
            "/static/ads/house/main-side-2.png",
            "/static/ads/house/main-side-3.png"
    );
    private final List<String> orderComplete = List.of(
            "/static/ads/house/order-1.png",
            "/static/ads/house/order-2.png",
            "/static/ads/house/order-3.png"
    );
    private final List<String> categoryTop = List.of(
            "/static/ads/house/category-1.png",
            "/static/ads/house/category-2.png",
            "/static/ads/house/category-3.png"
    );

    private final AtomicInteger idxRolling = new AtomicInteger();
    private final AtomicInteger idxSide = new AtomicInteger();
    private final AtomicInteger idxOrder = new AtomicInteger();
    private final AtomicInteger idxCat = new AtomicInteger();

    public String houseFor(AdSlotType type) {
        return switch (type) {
            case MAIN_ROLLING -> rolling.get(Math.floorMod(idxRolling.getAndIncrement(), rolling.size()));
            case MAIN_SIDE -> side.get(Math.floorMod(idxSide.getAndIncrement(), side.size()));
            case ORDER_COMPLETE -> orderComplete.get(Math.floorMod(idxOrder.getAndIncrement(), orderComplete.size()));
            case CATEGORY_TOP -> categoryTop.get(Math.floorMod(idxCat.getAndIncrement(), categoryTop.size()));
        };
    }

    public String houseForCategoryTop(String category) {
        // 카테고리별 세분화 원하면 맵으로 분기. 지금은 공용 세트 사용.
        return houseFor(AdSlotType.CATEGORY_TOP);
    }
}
