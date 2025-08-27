package com.meonjeo.meonjeo.exchange;

import com.meonjeo.meonjeo.exchange.dto.ExchangeDecisionRequest;
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
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/seller/exchanges")
@RequiredArgsConstructor
@Tag(name="교환(사장)")
public class SellerExchangeController {

    private final ExchangeService service;
    private final OrderExchangeRepository repo;
    private final AuthSupport auth;
    private final ShipmentService shipmentService;

    private Long sid() { return auth.currentUserId(); }

    @Operation(summary = "교환 송장 추적(사장)")
    @GetMapping("/{exchangeId}/tracking")
    public TrackingResponse track(@PathVariable Long exchangeId) {
        repo.findByIdAndSellerId(exchangeId, sid())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "EXCHANGE_NOT_FOUND"));

        try {
            return shipmentService.trackingByExchange(exchangeId);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "EXCHANGE_SHIPMENT_NOT_FOUND");
        }
    }

    @Operation(summary="대기중 교환 목록")
    @GetMapping("/pending")
    public List<ExchangeResponse> pending() {
        return repo.findBySellerIdAndStatusOrderByIdDesc(sid(), ExchangeStatus.REQUESTED)
                .stream()
                .map(service::toDto)
                .collect(Collectors.toList());
    }

    @Operation(summary="교환 승인")
    @PostMapping("/{id}/approve")
    public ExchangeResponse approve(@PathVariable Long id, @RequestBody @Valid ExchangeDecisionRequest req) {
        return service.approve(sid(), id, req);
    }

    @Operation(summary="교환 반려")
    @PostMapping("/{id}/reject")
    public ExchangeResponse reject(@PathVariable Long id, @RequestBody @Valid ExchangeDecisionRequest req) {
        return service.reject(sid(), id, req);
    }

    @Operation(summary="교환 발송 등록(송장)")
    @PostMapping("/{id}/ship")
    public ExchangeResponse ship(@PathVariable Long id,
                                 @RequestParam String carrier,
                                 @RequestParam String invoiceNo) {
        return service.shipReplacement(sid(), id, carrier, invoiceNo);
    }
}
