package com.yjs_default.yjs_default.company;

import com.yjs_default.yjs_default.user.dto.SignupRequest;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true)
    private String name; // 회사명

    @Column(nullable = true)
    private String ceoName; // 대표자명

    @Column(nullable = true)
    private String businessNumber; // 사업자 등록번호 (고유번호)

    @Column(nullable = true)
    private String industry; // 업종 (ex: 제조업, 도소매업)

    @Column(nullable = true)
    private String product; // 수출 품목 (AI 추천용)

    @Column(nullable = true)
    private String address; // 회사 주소

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public static Company createFrom(SignupRequest request) {
        return Company.builder()
                .name(request.getCompanyName())
                .ceoName(request.getCeoName())
                .businessNumber(request.getBusinessNumber())
                .industry(request.getIndustry())
                .product(request.getProduct())
                .address(request.getAddress())
                .build(); // createdAt, updatedAt은 @PrePersist로 자동 처리됨
    }

}
