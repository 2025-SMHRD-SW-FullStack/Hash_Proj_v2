// src/main/java/com/meonjeo/meonjeo/seller/SettlementController.java
package com.meonjeo.meonjeo.seller;

import com.meonjeo.meonjeo.seller.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Tag(name = "셀러 정산", description = "셀러의 일별 정산 예정 금액/상세 내역 조회 API")
@RestController
@RequestMapping("/api/seller/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService service;

    @Operation(
            summary = "일별 정산 요약",
            description = """
            • 기준: 구매확정일(confirmedAt) 기준으로 하루(00:00~24:00) 집계
            • 정산 예정 금액(payoutTotal) = 상품금액(itemTotal) - 플랫폼 수수료(3%) - 피드백 원고료 합계
            • 환급 예정 원고료(feedbackTotal)는 실제 피드백 작성된 아이템만 합산합니다.
            예) /api/seller/settlements/daily/summary?date=2025-08-29
        """,
            responses = {
                    @ApiResponse(responseCode = "200", description = "성공",
                            content = @Content(schema = @Schema(implementation = SellerDailySettlementDto.class)))
            }
    )
    @GetMapping("/daily/summary")
    public SellerDailySettlementDto dailySummary(
            @Parameter(description = "집계 기준 날짜(예: 2025-08-29)", required = true, example = "2025-08-29")
            @RequestParam String date
    ) {
        return service.summaryForDay(LocalDate.parse(date));
    }

    @Operation(
            summary = "일별 정산 상세 목록",
            description = """
            • 기준: 구매확정일(confirmedAt) 기준으로 하루(00:00~24:00) 확정된 주문의 셀러별 라인 집계
            • 각 행의 payout = itemTotal - platformFee(3%) - feedbackTotal(작성된 아이템만)
            예) /api/seller/settlements/daily/list?date=2025-08-29
        """,
            responses = {
                    @ApiResponse(responseCode = "200", description = "성공",
                            content = @Content(schema = @Schema(implementation = SellerSettlementRow.class)))
            }
    )
    @GetMapping("/daily/list")
    public List<SellerSettlementRow> dailyList(
            @Parameter(description = "집계 기준 날짜(예: 2025-08-29)", required = true, example = "2025-08-29")
            @RequestParam String date
    ) {
        return service.listForDay(LocalDate.parse(date));
    }
}
