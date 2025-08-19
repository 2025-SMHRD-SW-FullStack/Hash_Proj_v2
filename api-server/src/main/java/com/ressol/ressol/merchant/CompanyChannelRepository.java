package com.ressol.ressol.merchant;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CompanyChannelRepository extends JpaRepository<CompanyChannel, Long> {

    List<CompanyChannel> findByCompanyIdOrderByIdDesc(Long companyId);
    Optional<CompanyChannel> findByIdAndCompanyId(Long id, Long companyId);
    boolean existsByCompanyIdAndPlatformAndExternalId(Long companyId, CompanyChannel.Platform platform, String externalId);

    // ✅ 내 주변(거리순): Haversine(km) — 컬럼 명시 + 인터페이스 프로젝션
    @Query(value = """
        SELECT
          cc.id             AS id,
          cc.company_id     AS companyId,
          cc.display_name   AS name,
          cc.address        AS address,
          cc.latitude       AS latitude,
          cc.longitude      AS longitude,
          (6371 * ACOS(
              COS(RADIANS(:lat)) * COS(RADIANS(cc.latitude)) * COS(RADIANS(cc.longitude) - RADIANS(:lng))
            + SIN(RADIANS(:lat)) * SIN(RADIANS(cc.latitude))
          ))                AS distanceKm
        FROM company_channels cc
        WHERE cc.type = 'OFFLINE'
          AND cc.latitude IS NOT NULL
          AND cc.longitude IS NOT NULL
          AND cc.active = 1
        HAVING distanceKm <= :radiusKm
        ORDER BY distanceKm ASC
        LIMIT :limit OFFSET :offset
        """, nativeQuery = true)
    List<NearbyChannelRow> findNearbyOffline(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radiusKm") double radiusKm,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    // ✅ 지역(시/구) → 동 가나다순
    @Query("""
        SELECT cc FROM CompanyChannel cc
        WHERE cc.type = com.ressol.ressol.merchant.CompanyChannel.Type.OFFLINE
          AND cc.active = true
          AND (:sido IS NULL OR cc.sido = :sido)
          AND (:sigungu IS NULL OR cc.sigungu = :sigungu)
        ORDER BY cc.dong ASC, cc.displayName ASC
        """)
    List<CompanyChannel> findByRegionOrderByDongAsc(
            @Param("sido") String sido,
            @Param("sigungu") String sigungu,
            Pageable pageable
    );
}
