package com.meonjeo.meonjeo.product;

import com.meonjeo.meonjeo.product.dto.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * [프론트 가이드]
 * - 상품 등록시 JSON body 하나만 보내면 됩니다.
 * - 옵션이 없으면 variants 생략/빈배열 → 서버가 단일 SKU 자동 생성
 * - 옵션이 있으면 option1Name~option5Name 라벨 지정 + variants에 조합 나열
 */
@Tag(name="상품")
@RestController @RequestMapping("/api")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;

    @Operation(summary="상품 등록(셀러)", description="옵션 없는 단일상품 또는 최대 5단 옵션 조합까지 등록 가능")
    @PostMapping("/seller/products")
    public Long create(@RequestBody @Valid ProductCreateRequest req) {
        return productService.create(req);
    }

    @Operation(summary="상품 목록")
    @GetMapping("/products")
    public List<ProductResponse> list() {
        return productService.list();
    }

    @Operation(summary="상품 상세(+옵션 조합)")
    @GetMapping("/products/{id}")
    public ProductWithVariantsResponse get(@PathVariable Long id) {
        return productService.get(id);
    }
}
