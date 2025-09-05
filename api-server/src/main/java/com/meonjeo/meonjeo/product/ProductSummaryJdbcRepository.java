package com.meonjeo.meonjeo.product;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ProductSummaryJdbcRepository {
    private final JdbcTemplate jdbc;

    @Getter
    @AllArgsConstructor
    public static class ProductSummary {
        private Long id;
        private String name;
        private String thumbnailUrl;
    }

    public Optional<ProductSummary> findSummaryById(Long id) {
        String sql = "select id, name, thumbnail_url from products where id = ?";
        return jdbc.query(sql, ps -> ps.setLong(1, id), rs -> {
            if (rs.next()) {
                return Optional.of(new ProductSummary(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("thumbnail_url")
                ));
            }
            return Optional.empty();
        });
    }
}
