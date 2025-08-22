package com.meonjeo.meonjeo.mission;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MissionRepository extends JpaRepository<Mission, Long> {
    Page<Mission> findByCompanyId(Long companyId, Pageable pageable);
    Page<Mission> findByStatusAndStartAtBeforeAndEndAtAfter(Mission.Status status, java.time.LocalDateTime before, java.time.LocalDateTime after, Pageable pageable);
}
