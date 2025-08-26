package com.meonjeo.meonjeo.seller;

import com.meonjeo.meonjeo.seller.dto.SellerApplyRequest;
import com.meonjeo.meonjeo.seller.dto.SellerProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.*;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "셀러 승급(사용자)")
@RestController
@RequestMapping("/api/seller-apply")
@RequiredArgsConstructor
public class SellerApplyController {

    private final SellerService service;

    @Operation(summary = "셀러 승급 신청(또는 재신청)",
            requestBody = @RequestBody(
                    required = true,
                    content = @Content(mediaType = "application/json",
                            examples = @ExampleObject(value = """
                        {
                          "bizNo": "123-45-67890",
                          "shopName": "먼저써봄 상점",
                          "ownerName": "홍길동",
                          "addr": "서울시 강남구 테헤란로 123",
                          "category": "화장품",
                          "phone": "02-1234-5678"
                        }""")
                    )))
    @PostMapping
    public ResponseEntity<SellerProfileResponse> apply(@org.springframework.web.bind.annotation.RequestBody SellerApplyRequest req){
        return ResponseEntity.ok(service.apply(req));
    }

    @Operation(summary = "내 셀러 신청 현황 보기")
    @GetMapping("/me")
    public ResponseEntity<SellerProfileResponse> me(){
        var res = service.me();
        return (res == null) ? ResponseEntity.noContent().build() : ResponseEntity.ok(res);
    }
}
