package com.meonjeo.meonjeo.proof;

import com.meonjeo.meonjeo.proof.dto.OrderNumberRequest;
import com.meonjeo.meonjeo.security.AuthSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name="사용자 · 증빙", description="주문번호 등록(상품형)")
@RestController
@RequestMapping("/api/applications")
@SecurityRequirement(name="bearerAuth")
@RequiredArgsConstructor
public class ProofController {

    private final ProofService service;
    private final AuthSupport auth;

    @Operation(summary="(상품형) 주문번호 등록")
    @PostMapping("/{id}/order-number")
    public ResponseEntity<Void> order(@PathVariable Long id, @Valid @RequestBody OrderNumberRequest req){
        service.registerOrderNumber(auth.currentUserId(), id, req.orderNo());
        return ResponseEntity.ok().build();
    }

//    @Operation(summary="(오프라인) 영수증 등록")
//    @PostMapping("/{id}/receipt")
//    public ResponseEntity<Void> receipt(@PathVariable Long id, @Valid @RequestBody ReceiptRequest req){
//        service.registerReceipt(auth.currentUserId(), id, req.imageUrl(), req.amount(), req.ocrText());
//        return ResponseEntity.ok().build();
//    }
}
