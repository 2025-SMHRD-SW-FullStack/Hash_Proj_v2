package com.meonjeo.meonjeo.ad;

import org.springframework.stereotype.Component;
import java.time.temporal.ChronoUnit;

@Component
public class AdPricePolicy {
    // 문서 가격표: 7/14/30일
    public int computePrice(AdSlotType type, java.time.LocalDate start, java.time.LocalDate end){
        long days = ChronoUnit.DAYS.between(start, end) + 1; // 포함 범위
        int base;
        switch (type){
            case MAIN_ROLLING -> base = pick(days, 15000, 25000, 45000);
            case MAIN_SIDE    -> base = pick(days, 12000, 20000, 40000);
            case CATEGORY_TOP -> base = pick(days,  8000, 15000, 30000);
            case ORDER_COMPLETE -> base = pick(days, 5000, 10000, 20000);
            default -> throw new IllegalArgumentException("Unsupported type");
        }
        return base;
    }
    private int pick(long days, int d7, int d14, int d30){
        if (days == 7) return d7;
        if (days == 14) return d14;
        if (days == 30) return d30;
        throw new IllegalArgumentException("허용기간: 7/14/30일");
    }
}
