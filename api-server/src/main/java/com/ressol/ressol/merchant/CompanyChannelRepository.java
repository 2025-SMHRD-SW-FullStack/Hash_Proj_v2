package com.ressol.ressol.merchant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompanyChannelRepository extends JpaRepository<CompanyChannel, Long> {
    List<CompanyChannel> findByCompanyIdOrderByIdDesc(Long companyId);
    Optional<CompanyChannel> findByIdAndCompanyId(Long id, Long companyId);
    boolean existsByCompanyIdAndPlatformAndExternalId(Long companyId, CompanyChannel.Platform platform, String externalId);
}
