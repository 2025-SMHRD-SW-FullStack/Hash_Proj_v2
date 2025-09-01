package com.meonjeo.meonjeo.seller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** seller_profiles에서 승인 여부만 빠르게 확인하기 위한 JDBC 리포 */
@Repository
@RequiredArgsConstructor
public class SellerProfileJdbcRepository {
    private final JdbcTemplate jdbc;

    /** status='APPROVED' 행이 있으면 셀러로 간주 */
    public boolean isApproved(Long userId) {
        return Boolean.TRUE.equals(
                jdbc.query(
                        "select 1 from seller_profiles where user_id=? and status='APPROVED' limit 1",
                        ps -> ps.setLong(1, userId),
                        rs -> rs.next() ? Boolean.TRUE : Boolean.FALSE
                )
        );
    }
}
