package com.ressol.ressol.application;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MissionApplicationRepository extends JpaRepository<MissionApplication, Long> {
    boolean existsByMissionIdAndUserId(Long missionId, Long userId);
    Optional<MissionApplication> findByIdAndUserId(Long id, Long userId);
}
