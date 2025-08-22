package com.meonjeo.meonjeo.referral;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReferralRepository extends JpaRepository<Referral, Long> {
    Optional<Referral> findByReferee_Id(Long refereeId);
    List<Referral> findAllByReferrer_Id(Long referrerId);
    long countByReferrer_IdAndStatus(Long referrerId, Referral.Status status);
    boolean existsByReferee_Id(Long refereeId);
}
