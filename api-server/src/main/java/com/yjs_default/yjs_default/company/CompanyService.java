package com.yjs_default.yjs_default.company;

import com.yjs_default.yjs_default.company.dto.CompanyResponse;
import com.yjs_default.yjs_default.company.dto.CompanyUpdateRequest;
import com.yjs_default.yjs_default.user.User;
import com.yjs_default.yjs_default.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public CompanyResponse getCompanyInfo(User user) {
        Company company = user.getCompany();
        return company != null ? new CompanyResponse(company) : null;
    }

    @Transactional
    public CompanyResponse updateCompanyInfo(User user, CompanyUpdateRequest request) {
        Company company = user.getCompany();

        if (company == null) {
            company = Company.builder()
                    .name(request.getName())
                    .ceoName(request.getCeoName())
                    .businessNumber(request.getBusinessNumber())
                    .industry(request.getIndustry())
                    .product(request.getProduct())
                    .address(request.getAddress())
                    .build();
        } else {
            company.setName(request.getName());
            company.setCeoName(request.getCeoName());
            company.setBusinessNumber(request.getBusinessNumber());
            company.setIndustry(request.getIndustry());
            company.setProduct(request.getProduct());
            company.setAddress(request.getAddress());
        }

        Company savedCompany = companyRepository.save(company);
        user.setCompany(savedCompany);
        userRepository.save(user);

        return new CompanyResponse(savedCompany);
    }

    public CompanyResponse getCompanyInfoByUserEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자 정보 없음"));
        Company company = user.getCompany();
        if (company == null) throw new RuntimeException("등록된 회사 정보 없음");

        return new CompanyResponse(company);
    }

}
