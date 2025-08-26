package com.meonjeo.meonjeo.ad;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@RequiredArgsConstructor
@Profile({"local","dev"}) // 운영에선 Flyway로만!
public class AdSlotSeeder {

    private final AdSlotRepository slotRepo;

    @Bean
    ApplicationRunner seedAdSlots() {
        return args -> {
            if (slotRepo.count() > 0) return; // 이미 있으면 스킵

            // MAIN_ROLLING 1~10
            for (int i=1;i<=10;i++) {
                slotRepo.save(AdSlot.builder()
                        .type(AdSlotType.MAIN_ROLLING)
                        .position(i)
                        .category(null)
                        .build());
            }

            // MAIN_SIDE 1~3
            for (int i=1;i<=3;i++) {
                slotRepo.save(AdSlot.builder()
                        .type(AdSlotType.MAIN_SIDE)
                        .position(i)
                        .category(null)
                        .build());
            }

            // CATEGORY_TOP x 카테고리 x 1~5
            String[] cats = {"beauty","electronics","meal-kit","platform"};
            for (String c : cats) {
                for (int i=1;i<=5;i++) {
                    slotRepo.save(AdSlot.builder()
                            .type(AdSlotType.CATEGORY_TOP)
                            .position(i)
                            .category(c)
                            .build());
                }
            }
        };
    }
}
