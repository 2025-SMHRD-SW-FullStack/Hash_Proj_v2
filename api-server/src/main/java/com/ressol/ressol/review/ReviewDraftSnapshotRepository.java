package com.ressol.ressol.review;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewDraftSnapshotRepository extends JpaRepository<ReviewDraftSnapshot, Long> {
    List<ReviewDraftSnapshot> findTop50ByReviewIdOrderByCreatedAtDesc(Long reviewId);
}
