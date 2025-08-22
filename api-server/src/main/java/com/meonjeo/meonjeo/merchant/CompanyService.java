package com.meonjeo.meonjeo.merchant;

import com.meonjeo.meonjeo.exception.BadRequestException;
import com.meonjeo.meonjeo.exception.NotFoundException;
import com.meonjeo.meonjeo.merchant.dto.CompanyDto;
import com.meonjeo.meonjeo.merchant.dto.CompanyUpsertRequest;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepo;
    private final UserRepository userRepo;
    private final CompanyMapper mapper;

    @Transactional
    public CompanyDto upsertMyCompany(Long me, CompanyUpsertRequest req){
        User owner = userRepo.findById(me)
                .orElseThrow(() -> new NotFoundException("user not found"));

        // 오너당 첫 회사 생성 or 첫 회사 수정 (MVP: 1개 기준)
        Company company = companyRepo.findAll().stream()
                .filter(c -> c.getOwner().getId().equals(me))
                .findFirst()
                .orElseGet(() -> Company.builder()
                        .owner(owner)
                        .status(Company.Status.PENDING)
                        .build());

        company.setName(req.name());
        company.setBizRegNo(req.bizRegNo());
        company.setContact(req.contact());
        company.setAddress(req.address());
        company.setPayoutBank(req.payoutBank());
        company.setPayoutAccount(req.payoutAccount());
        company.setPayoutHolder(req.payoutHolder());
        company.setRejectReason(null); // 수정 시 반려사유 초기화

        return mapper.toDto(companyRepo.save(company));
    }

    @Transactional
    public CompanyDto getMyCompany(Long me){
        Company c = companyRepo.findAll().stream()
                .filter(x -> x.getOwner().getId().equals(me))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("company not found"));
        return mapper.toDto(c);
    }

    public Page<CompanyDto> list(Company.Status status, Pageable pageable){
        return (status == null
                ? companyRepo.findAll(pageable)
                : companyRepo.findByStatus(status, pageable))
                .map(mapper::toDto);
    }

    @Transactional
    public void approve(Long id){
        Company c = companyRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("company not found"));
        c.setStatus(Company.Status.APPROVED);
        c.setRejectReason(null);

        companyRepo.save(c);
    }

    @Transactional
    public void reject(Long id, String reason){
        Company c = companyRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("company not found"));
        if (reason == null || reason.isBlank()) throw new BadRequestException("reject reason required");
        c.setStatus(Company.Status.REJECTED);
        c.setRejectReason(reason);
        companyRepo.save(c);
    }
}
