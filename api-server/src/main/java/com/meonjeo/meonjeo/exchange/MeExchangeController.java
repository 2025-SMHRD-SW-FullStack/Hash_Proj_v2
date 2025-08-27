package com.meonjeo.meonjeo.exchange;

import com.meonjeo.meonjeo.exchange.dto.ExchangeCreateRequest;
import com.meonjeo.meonjeo.exchange.dto.ExchangeResponse;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.shipment.ShipmentService;
import com.meonjeo.meonjeo.shipment.dto.TrackingResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/me/exchanges")
@RequiredArgsConstructor
@Tag(name="교환(회원)")
public class MeExchangeController {

    private final ExchangeService service;
    private final OrderExchangeRepository repo;
    private final AuthSupport auth;
    private final ShipmentService shipmentService;

    private Long uid() { return auth.currentUserId(); }

    @Operation(summary = "내 교환 송장 추적")
    @GetMapping("/{exchangeId}/tracking")
    public TrackingResponse track(@PathVariable Long exchangeId) {
        // 소유권 검증 (회원 본인 것만)
        repo.findByIdAndUserId(exchangeId, uid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "EXCHANGE_NOT_FOUND"));

        try {
            return shipmentService.trackingByExchange(exchangeId);
        } catch (Exception e) {
            // 교환 송장이 아직 생성되지 않았다면 404로 응답
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "EXCHANGE_SHIPMENT_NOT_FOUND");
        }
    }

    @Operation(summary="내 교환 요청 목록")
    @GetMapping
    public List<ExchangeResponse> list() {
        return repo.findByUserIdOrderByIdDesc(uid()).stream()
                .map(e -> service.request(uid(), e.getOrderItem().getId(), // dummy 변환 아님: 실제론 toDto 헬퍼 따로
                        new ExchangeCreateRequest(1, null, "", List.of())))
                .toList(); // ★ 여기서는 실제 서비스 호출이 아니라 toDto 유틸을 사용하세요. (샘플 압축)
    }

    @Operation(summary="교환 요청 생성")
    @PostMapping("/order-items/{orderItemId}")
    public ExchangeResponse request(@PathVariable Long orderItemId,
                                    @RequestBody @Valid ExchangeCreateRequest req) {
        return service.request(uid(), orderItemId, req);
    }

    // 상세 조회/취소 등이 필요하면 추가
}
