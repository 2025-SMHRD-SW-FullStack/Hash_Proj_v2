package com.meonjeo.meonjeo.ad;

import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;

public interface AdBookingRepository extends JpaRepository<AdBooking, Long> {

    // ⬇️ 이미 예약된 기간과 겹치는지 확인 (결제 미완/결제완료/진행 중을 모두 겹침으로 본다)
    @Query("""
           select b from AdBooking b
           where b.slot.id = :slotId
             and b.status in ('RESERVED_UNPAID','RESERVED_PAID','ACTIVE')
             and b.startDate <= :endDate and b.endDate >= :startDate
           """)
    List<AdBooking> findOverlapped(@Param("slotId") Long slotId,
                                   @Param("startDate") LocalDate start,
                                   @Param("endDate") LocalDate end);

    // 동시성 방지용(트랜잭션 내 락)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           select b from AdBooking b
           where b.slot.id = :slotId
             and b.status in ('RESERVED_UNPAID','RESERVED_PAID','ACTIVE')
             and b.startDate <= :endDate and b.endDate >= :startDate
           """)
    List<AdBooking> findOverlappedForUpdate(@Param("slotId") Long slotId,
                                            @Param("startDate") LocalDate start,
                                            @Param("endDate") LocalDate end);

    Page<AdBooking> findBySellerIdOrderByIdDesc(Long sellerId, Pageable pageable);
    Page<AdBooking> findBySellerIdAndStatusOrderByIdDesc(Long sellerId, AdBookingStatus status, Pageable pageable);
    Page<AdBooking> findBySellerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByIdDesc(
            Long sellerId, LocalDate to, LocalDate from, Pageable pageable);

    @Query("""
            select b from AdBooking b
            join b.slot s
            where s.type = :type
              and (:category is null or s.category = :category)
              and b.status = 'ACTIVE'
              and b.startDate <= :date and b.endDate >= :date
            order by s.position asc
            """)
    List<AdBooking> findActiveFor(
            @Param("type") AdSlotType type,
            @Param("category") String category,
            @Param("date") java.time.LocalDate date);

    Page<AdBooking> findByStatus(AdBookingStatus status, Pageable pageable);
}
