package com.ressol.ressol.merchant;

import com.ressol.ressol.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "companies",
        uniqueConstraints = {@UniqueConstraint(name = "uk_company_biz", columnNames = "bizRegNo")},
        indexes = {@Index(name="ix_company_owner", columnList="owner_id"),
                @Index(name="ix_company_status", columnList="status")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Company {

    public enum Status { PENDING, APPROVED, REJECTED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 한 유저가 여러 매장을 가질 수 있게 ManyToOne
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false) private String name;         // 상호
    @Column(nullable = false, length = 20) private String bizRegNo; // 사업자번호

    private String contact;       // 010-...
    private String address;       // 도로명 주소
    private String payoutBank;    // 정산 은행
    private String payoutAccount; // 정산 계좌
    private String payoutHolder;  // 예금주

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private Status status;        // PENDING/APPROVED/REJECTED

    private String rejectReason;  // 반려 사유

    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp  private LocalDateTime updatedAt;
}
