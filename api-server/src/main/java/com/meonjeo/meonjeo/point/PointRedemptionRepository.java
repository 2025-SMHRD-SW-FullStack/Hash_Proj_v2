package com.meonjeo.meonjeo.point;

import com.meonjeo.meonjeo.point.dto.AdminRedemptionItem;
import com.meonjeo.meonjeo.point.dto.RedemptionStatus;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PointRedemptionRepository extends JpaRepository<PointRedemption, Long> {
    Page<PointRedemption> findByUserIdOrderByIdDesc(Long userId, Pageable pageable);
    Page<PointRedemption> findByStatusOrderByIdAsc(RedemptionStatus status, Pageable pageable);

    // 👇 어드민 목록용: User 조인 + 상태/닉네임(q) 필터 + 페이지네이션
    @Query(value = """
            select new com.meonjeo.meonjeo.point.dto.AdminRedemptionItem(
                r.id, u.id, u.nickname, r.amount, r.status, r.createdAt, r.processedAt
            )
            from PointRedemption r
            join User u on u.id = r.userId
            where (:status is null or r.status = :status)
              and (:q is null or :q = '' or lower(u.nickname) like lower(concat('%', :q, '%')))
            order by r.id asc
            """,
            countQuery = """
            select count(r)
            from PointRedemption r
            join User u on u.id = r.userId
            where (:status is null or r.status = :status)
              and (:q is null or :q = '' or lower(u.nickname) like lower(concat('%', :q, '%')))
            """
    )
    Page<AdminRedemptionItem> searchAdminList(@Param("status") RedemptionStatus status,
                                              @Param("q") String q,
                                              Pageable pageable);

}
