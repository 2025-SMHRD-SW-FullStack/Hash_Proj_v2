package com.meonjeo.meonjeo.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    // ✅ ProductService.get()에서 사용하는 메서드 (목록 조회)
    @Query("select v from ProductVariant v where v.product.id = :productId")
    List<ProductVariant> findByProductId(@Param("productId") Long productId);

    // ✅ 체크아웃/결제 시 SKU 매칭용 (옵션 조합으로 1건 찾기)
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
}
