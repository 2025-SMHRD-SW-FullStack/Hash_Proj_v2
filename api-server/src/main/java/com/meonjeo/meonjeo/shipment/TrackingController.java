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
        // 1) code가 "04" 같은 2자리 숫자가 아니어도 이름으로 맞춰줌
        String sweetCode = resolveSweetCode(code);
        if (sweetCode == null) throw new IllegalArgumentException("알 수 없는 택배사: " + code);

        // 2) 운송장 정규화(숫자/영문/하이픈만) + 최소 길이 가드
        String inv = invoice == null ? null : invoice.replaceAll("[^0-9A-Za-z-]", "");
        if (inv == null || inv.length() < 6) throw new IllegalArgumentException("운송장 형식 오류");

        return tracking.track(code, invoice);
    }

    // === 아래 유틸 메서드 컨트롤러 내부에 추가 ===
    private String resolveSweetCode(String input) {
        if (input == null) return null;
        String s = input.trim();
        if (s.matches("\\d{2}")) return s; // 이미 2자리 숫자
        // 코드로 직접 찾기
        var byCode = repo.findByCode(s);
        if (byCode.isPresent()) return byCode.get().getCode();
        // 이름 부분 일치로 찾기
        String q = s.toLowerCase();
        return repo.findAll().stream()
                .filter(c -> c.getName()!=null && c.getName().toLowerCase().contains(q))
                .map(CourierCompany::getCode)
                .findFirst()
                .orElse(null);
    }
}
