package com.meonjeo.meonjeo.point;

import com.meonjeo.meonjeo.point.dto.RedemptionStatus;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PointRedemptionRepository extends JpaRepository<PointRedemption, Long> {
    Page<PointRedemption> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);
    Page<PointRedemption> findByStatusOrderByIdAsc(RedemptionStatus status, Pageable pageable);
}
