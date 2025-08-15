package com.ressol.ressol.review;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    Optional<Review> findByMissionIdAndUserIdAndStatus(Long missionId, Long userId, ReviewStatus status);
}
