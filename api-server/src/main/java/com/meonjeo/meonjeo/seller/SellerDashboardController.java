package com.meonjeo.meonjeo.seller;

import com.meonjeo.meonjeo.seller.dto.SellerDashboardStatsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "셀러 대시보드")
@RestController
@RequestMapping("/api/seller/dashboard")
@RequiredArgsConstructor
public class SellerDashboardController {

    private final SellerDashboardService service;

    @Operation(summary = "셀러 대시보드 통계 (신규 주문/신규 피드백 등)")
    @GetMapping("/stats")
    public SellerDashboardStatsResponse getStats(
            @RequestParam(required = false) LocalDate targetDate
    ) {
        LocalDate date = targetDate != null ? targetDate : LocalDate.now();
        return service.getDashboardStats(date);
    }
}
