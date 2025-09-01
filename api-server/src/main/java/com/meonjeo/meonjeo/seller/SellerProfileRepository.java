package com.meonjeo.meonjeo.seller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface SellerProfileRepository extends JpaRepository<SellerProfile, Long> {

    Optional<SellerProfile> findByUserId(Long userId);
    boolean existsByUserIdAndStatus(Long userId, SellerStatus status);

    // fetch join 제거(페이지네이션 카운트 유도 문제 방지)
    // User(userRef)는 EntityGraph로 함께 로드 (N+1 완화)
    @EntityGraph(attributePaths = "userRef")
    @Query("""
        select sp
        from SellerProfile sp
        left join sp.userRef u
        where (:status is null or sp.status = :status)
          and (
               :q is null or :q = '' or
               lower(u.email)    like lower(concat('%', :q, '%')) or
               lower(u.nickname) like lower(concat('%', :q, '%')) or
               lower(sp.shopName) like lower(concat('%', :q, '%')) or
               lower(sp.bizNo)    like lower(concat('%', :q, '%'))
          )
        order by sp.id desc
    """)
    Page<SellerProfile> searchForAdmin(@Param("status") SellerStatus status,
                                       @Param("q") String q,
                                       Pageable pageable);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("delete from SellerProfile sp where sp.userId = :uid")
    int deleteByUserId(@Param("uid") Long userId);
}
