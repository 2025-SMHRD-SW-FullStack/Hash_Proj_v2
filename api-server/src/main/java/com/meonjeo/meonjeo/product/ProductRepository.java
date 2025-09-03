package com.meonjeo.meonjeo.product;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("""
      select p from Product p
      where (:now is null or (coalesce(p.saleStartAt, :now) <= :now and coalesce(p.saleEndAt, :now) >= :now))
      order by p.id desc
    """)
    List<Product> findPublic(@Param("now") LocalDateTime now);


    // 셀러 페이지용 (이미 쓰고 있다면 유지)
    List<Product> findBySellerIdOrderByIdDesc(Long sellerId);

    // ✅ 총 재고가 충분할 때만 감소(원자 연산) — 결제 최종 승인 시 사용
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Product p set p.stockTotal = p.stockTotal - :qty where p.id = :productId and p.stockTotal >= :qty")
    int decreaseStockTotalIfEnough(@Param("productId") Long productId, @Param("qty") int qty);
}
