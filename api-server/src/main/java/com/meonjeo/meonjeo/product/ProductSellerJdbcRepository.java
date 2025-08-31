package com.meonjeo.meonjeo.product;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ProductSellerJdbcRepository {
    private final JdbcTemplate jdbcTemplate;

    public Optional<Long> findSellerIdByProductId(Long productId) {
        List<Long> rows = jdbcTemplate.query(
                "select seller_id from products where id = ?",
                (rs, i) -> rs.getLong(1),
                productId
        );
        return rows.stream().findFirst();
    }
}
