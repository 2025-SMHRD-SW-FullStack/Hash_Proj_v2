package com.ressol.ressol.review;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserReviewAssetRepository extends JpaRepository<UserReviewAsset, Long> {

    List<UserReviewAsset> findByUserIdAndAnalyzedFalse(Long userId);

    // ✅ 최신 사용자 샘플(분석 여부 무관) 상위 5개
    List<UserReviewAsset> findTop5ByUserIdOrderByCreatedAtDesc(Long userId);
}
