package com.meonjeo.meonjeo.ad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
public interface AdSlotRepository extends JpaRepository<AdSlot, Long> {
    List<AdSlot> findByTypeOrderByPositionAsc(AdSlotType type);
    List<AdSlot> findByTypeAndCategoryOrderByPositionAsc(AdSlotType type, String category);
    // 추가
    @Query("""
                select distinct s.category from AdSlot s
                where s.type = :type and s.category is not null
            """)
    List<String> distinctCategories(@Param("type") AdSlotType type);

}
