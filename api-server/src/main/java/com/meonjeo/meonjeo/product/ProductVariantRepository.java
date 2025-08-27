package com.meonjeo.meonjeo.product;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    @Query("select v from ProductVariant v where v.product.id = :productId")
    List<ProductVariant> findByProductId(@Param("productId") Long productId);

    @Query("""
      select v from ProductVariant v
      where v.product.id = :productId
        and ((:o1 is null and v.option1Value is null) or v.option1Value = :o1)
        and ((:o2 is null and v.option2Value is null) or v.option2Value = :o2)
        and ((:o3 is null and v.option3Value is null) or v.option3Value = :o3)
        and ((:o4 is null and v.option4Value is null) or v.option4Value = :o4)
        and ((:o5 is null and v.option5Value is null) or v.option5Value = :o5)
    """)
    Optional<ProductVariant> matchOne(
            @Param("productId") Long productId,
            @Param("o1") String o1, @Param("o2") String o2, @Param("o3") String o3,
            @Param("o4") String o4, @Param("o5") String o5
    );

    /** 재고가 충분할 때만 감소(원자 연산). finalizePaid에서 사용 */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update ProductVariant v set v.stock = v.stock - :qty where v.id = :id and v.stock >= :qty")
    int decreaseStockIfEnough(@Param("id") Long variantId, @Param("qty") int qty);

    /** 해당 상품의 모든 옵션 조합 삭제 */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from ProductVariant v where v.product.id = :productId")
    void deleteByProductId(@Param("productId") Long productId);
}
