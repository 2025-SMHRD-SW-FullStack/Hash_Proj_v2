package com.ressol.ressol.review;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserPromptPresetRepository extends JpaRepository<UserPromptPreset, Long> {
    Optional<UserPromptPreset> findTopByUserIdAndPlatformOrderByUseCountDesc(Long userId, String platform);
}
