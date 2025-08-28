package com.meonjeo.meonjeo.seller;

import com.meonjeo.meonjeo.seller.dto.SellerFeedbackSummaryResponse;
import com.meonjeo.meonjeo.seller.dto.SellerFeedbackDemographicsResponse;
import com.meonjeo.meonjeo.seller.dto.SellerQuestionStatsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "셀러 피드백 통계")
@RestController
@RequestMapping("/api/seller/feedbacks")
@RequiredArgsConstructor
public class SellerFeedbackStatsController {

    private final SellerFeedbackStatsService service;

    @Operation(summary = "피드백 요약(건수/평균/분포)")
    @GetMapping("/summary")
    public SellerFeedbackSummaryResponse summary(
            @RequestParam Long productId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return service.summary(productId, from, to);
    }

    @Operation(summary = "피드백 인구통계(성별/연령대 분포 + 평균)")
    @GetMapping("/demographics")
    public SellerFeedbackDemographicsResponse demographics(
            @RequestParam Long productId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return service.demographics(productId, from, to);
    }

    @Operation(summary = "설문 항목별 분포/평균 (상품 카테고리별 정의에 따름)")
    @GetMapping("/questions")
    public SellerQuestionStatsResponse questions(
            @RequestParam Long productId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return service.questions(productId, from, to);
    }
}
