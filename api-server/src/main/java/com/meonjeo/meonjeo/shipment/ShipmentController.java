package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.shipment.dto.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name="배송")
@RestController @RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentController {
    private final ShipmentService shipmentService;

    @Operation(summary="일괄 발송 처리(택배사/송장)")
    @PostMapping("/dispatch")
    public void dispatch(@RequestBody @Valid DispatchRequest req) {
        shipmentService.dispatch(req);
    }

    @Operation(summary="배송 추적(내장 모달용)")
    @GetMapping("/{orderId}/tracking")
    public TrackingResponse tracking(@PathVariable Long orderId) {
        return shipmentService.tracking(orderId);
    }
}
