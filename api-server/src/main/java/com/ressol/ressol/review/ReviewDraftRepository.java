package com.ressol.ressol.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReviewDraftRepository extends JpaRepository<ReviewDraft, Long> {
    Optional<ReviewDraft> findByApplicationId(Long applicationId);
}