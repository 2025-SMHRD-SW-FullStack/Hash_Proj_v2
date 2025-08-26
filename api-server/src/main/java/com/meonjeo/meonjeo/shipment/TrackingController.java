package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.shipment.dto.TrackingResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "배송/스윗트래커")
@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class TrackingController {

    private final CarrierSyncService carrierSync;
    private final CourierCompanyRepository repo;
    private final TrackingService tracking;

    @Operation(
            summary = "택배사 목록 조회",
            description = "DB에 택배사 코드가 비어있으면 스윗트래커 API(companylist)를 호출해 자동 동기화 후 목록을 반환합니다."
    )
    @ApiResponse(responseCode = "200", description = "성공")
    @GetMapping("/companies")
    public List<CourierCompany> companies() {
        if (repo.count() == 0) carrierSync.syncNow();
        return repo.findAll();
    }

    @Operation(
            summary = "택배사 코드 강제 동기화",
            description = "스윗트래커 API(companylist)를 즉시 호출하여 DB에 upsert 합니다. 반환값은 동기화된(삽입/갱신) 건수입니다."
    )
    @ApiResponse(responseCode = "200", description = "성공")
    @PostMapping("/companies/sync")
    public int forceSync() {
        return carrierSync.syncNow();
    }

    @Operation(
            summary = "운송장 추적",
            description = "스윗트래커 실시간 조회를 통해 진행 단계(1~6)와 원문 이벤트 타임라인을 반환합니다."
    )
    @ApiResponse(responseCode = "200", description = "성공")
    @GetMapping("/track")
    public TrackingResult track(
            @Parameter(name = "code", description = "스윗트래커 택배사 코드(예: CJ대한통운=04, 롯데=05, 한진=08 등)", example = "04")
            @RequestParam String code,
            @Parameter(name = "invoice", description = "운송장 번호(숫자만)", example = "612345678901")
            @RequestParam String invoice
    ) {
        return tracking.track(code, invoice);
    }
}
