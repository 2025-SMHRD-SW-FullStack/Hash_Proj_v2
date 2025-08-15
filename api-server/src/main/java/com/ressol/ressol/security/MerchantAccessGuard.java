package com.ressol.ressol.security;

import com.ressol.ressol.exception.ForbiddenException;
import com.ressol.ressol.exception.NotFoundException;
import com.ressol.ressol.merchant.Company;
import com.ressol.ressol.merchant.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Transactional(readOnly = true) // ✅ 읽기 전용
public class MerchantAccessGuard {

    private final CompanyRepository companyRepo;

    /** 회사가 내가 소유 & APPROVED 상태인지 검사 후 반환 (단일 쿼리) */
    public Company requireCompanyOwnershipAndApproved(Long companyId, Long userId){
        return companyRepo.findByIdAndOwnerId(companyId, userId)
                .map(c -> {
                    if (c.getStatus() != Company.Status.APPROVED) {
                        throw new ForbiddenException("company not approved");
                    }
                    return c;
                })
                .orElseThrow(() -> new NotFoundException("company not found or not yours"));
    }

    /** 내 회사(유일/MVP) 가져오기 + APPROVED 필수 (단일 쿼리) */
    public Company requireMyApprovedCompany(Long userId){
        return companyRepo.findFirstByOwnerIdAndStatusOrderByIdDesc(userId, Company.Status.APPROVED)
                .orElseThrow(() -> new ForbiddenException("no approved company"));
    }

    /** 내가 승인된 회사를 가지고 있는지만 빠르게 확인 */
    public boolean hasApprovedCompany(Long userId){
        return companyRepo.existsByOwnerIdAndStatus(userId, Company.Status.APPROVED);
    }

    /** (옵션) 상태 무관 소유권만 확인할 때 */
    public Company requireOwnership(Long companyId, Long userId){
        return companyRepo.findByIdAndOwnerId(companyId, userId)
                .orElseThrow(() -> new ForbiddenException("not your company"));
    }
}
