package com.meonjeo.meonjeo.shipment;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor @EnableScheduling
public class CarrierSyncService {
    private final SweetTrackerClient client;
    private final CourierCompanyRepository repo;

    @Transactional
    public int syncNow(){
        Map<String,Object> res = client.companyList(); // { Company: [ {Code, Name, International}, ... ] }
        List<Map<String,Object>> arr = (List<Map<String,Object>>) res.getOrDefault("Company", List.of());
        int upserts = 0;
        for (var m : arr) {
            String code = String.valueOf(m.get("Code"));
            String name = String.valueOf(m.get("Name"));
            Boolean intl = (m.get("International") != null) ? Boolean.valueOf(m.get("International").toString()) : null;

            var entity = repo.findByCode(code).orElseGet(CourierCompany::new);
            if (entity.getId() == null) entity.setCode(code);
            entity.setName(name);
            entity.setInternationalYn(intl);
            repo.save(entity);
            upserts++;
        }
        return upserts;
    }

    // 매일 03:00 자동 동기화
    @Scheduled(cron = "0 0 3 * * *")
    public void nightlySync(){ syncNow(); }
}
