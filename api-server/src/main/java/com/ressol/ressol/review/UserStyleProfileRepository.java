package com.ressol.ressol.review;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserStyleProfileRepository extends JpaRepository<UserStyleProfile, Long> {
    Optional<UserStyleProfile> findByUserId(Long userId);
}