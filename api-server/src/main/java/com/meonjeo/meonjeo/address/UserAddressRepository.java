package com.meonjeo.meonjeo.address;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;


public interface UserAddressRepository extends JpaRepository<UserAddress, Long> {

    // 목록/조회
    List<UserAddress> findByUserIdOrderByIdDesc(Long userId);
    Optional<UserAddress> findByIdAndUserId(Long id, Long userId);

    // 기본주소 존재/개수
    boolean existsByUserIdAndPrimaryAddressTrue(Long userId);
    int countByUserIdAndPrimaryAddressTrue(Long userId);

    // 유저 주소 존재 여부
    boolean existsByUserId(Long userId);

    // 승격 후보(가장 최근/가장 오래된 것 중 원하는 걸로 사용)
    Optional<UserAddress> findTopByUserIdOrderByIdDesc(Long userId);
    Optional<UserAddress> findFirstByUserIdOrderByIdAsc(Long userId);

    // 기본 주소 해제 쿼리
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update UserAddress a set a.primaryAddress=false where a.userId=:uid")
    int clearPrimaryForUser(@Param("uid") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update UserAddress a set a.primaryAddress=false where a.userId=:uid and a.id<>:keepId")
    int clearPrimaryExcept(@Param("uid") Long userId, @Param("keepId") Long keepId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("delete from UserAddress a where a.userId = :uid")
    int deleteByUserId(@Param("uid") Long userId);
}
