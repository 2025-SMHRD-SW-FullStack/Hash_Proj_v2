package com.meonjeo.meonjeo.address;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserAddressRepository extends JpaRepository<UserAddress, Long> {
    List<UserAddress> findByUserIdOrderByIdDesc(Long userId);
    Optional<UserAddress> findByIdAndUserId(Long id, Long userId);
    Optional<UserAddress> findTopByUserIdOrderByIdDesc(Long userId);
    boolean existsByUserIdAndPrimaryAddressTrue(Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update UserAddress a set a.primaryAddress=false where a.userId=:uid")
    int clearPrimaryForUser(@Param("uid") Long userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update UserAddress a set a.primaryAddress=false where a.userId=:uid and a.id<>:keepId")
    int clearPrimaryExcept(@Param("uid") Long userId, @Param("keepId") Long keepId);

}
