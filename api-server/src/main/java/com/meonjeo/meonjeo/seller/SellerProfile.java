package com.meonjeo.meonjeo.seller;

import com.meonjeo.meonjeo.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name="seller_profiles", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SellerProfile {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="user_id", nullable=false)
    private Long userId;

    @Column(name="biz_no", length=20)          // 사업자 등록번호
    private String bizNo;

    @Column(name="shop_name", length=100)
    private String shopName;

    @Column(name="owner_name", length=50)
    private String ownerName;

    @Column(name="addr", length=255)
    private String addr;

    @Column(name="category", length=50)
    private String category;

    @Column(name="phone", length=30)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name="status", length=20, nullable=false)
    private SellerStatus status; // PENDING / APPROVED / REJECTED

    @Column(name="reject_reason", length=500)
    private String rejectReason; // 거절사유(선택)

    // 조회용 조인(쓰기 필드는 userId 사용)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="user_id", insertable = false, updatable = false)
    private User userRef;

    @CreationTimestamp @Column(name="created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp @Column(name="updated_at")
    private LocalDateTime updatedAt;
}
