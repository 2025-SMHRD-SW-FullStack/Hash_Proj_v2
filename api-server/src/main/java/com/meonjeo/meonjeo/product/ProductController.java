package com.meonjeo.meonjeo.product;

import com.meonjeo.meonjeo.product.dto.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name="상품")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;

    // ====== 공개(비로그인 가능) ======
    @Operation(summary="상품 목록(공개)")
    @GetMapping("/products")
    public List<ProductResponse> listPublic() {
        return productService.listPublic();
    }

    @Operation(summary="상품 상세(+옵션 조합, 공개)")
    @GetMapping("/products/{id}")
    public ProductWithVariantsResponse getPublic(@PathVariable Long id) {
        return productService.getPublic(id);
    }

    // ====== 셀러/관리자 전용 ======
    @Operation(summary="상품 등록(셀러/관리자)")
    @PostMapping("/seller/products")
    @PreAuthorize("hasAnyRole('SELLER','ADMIN')")
    public Long create(@RequestBody @Valid ProductCreateRequest req) {
        return productService.create(req);
    }

    @Operation(summary="내 상품 목록(셀러 전용)")
    @GetMapping("/seller/products")
    @PreAuthorize("hasAnyRole('SELLER','ADMIN')")
    public List<ProductResponse> listMine() {
        return productService.listForCurrentPrincipal();
    }

    @Operation(summary="상품 수정(셀러/관리자) — 옵션 배열 전달 시 옵션 전면 교체")
    @PutMapping("/seller/products/{id}")
    @PreAuthorize("hasAnyRole('SELLER','ADMIN')")
    public void update(@PathVariable Long id, @RequestBody @Valid ProductCreateRequest req) {
        productService.update(id, req);
    }

    @Operation(summary="상품 삭제(셀러/관리자)")
    @DeleteMapping("/seller/products/{id}")
    @PreAuthorize("hasAnyRole('SELLER','ADMIN')")
    public void delete(@PathVariable Long id) {
        productService.delete(id);
    }

    // 관리자 전용 상품 삭제 엔드포인트
    @Operation(summary="상품 삭제(관리자 전용)")
    @DeleteMapping("/admin/products/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void adminDelete(@PathVariable Long id) {
        productService.delete(id); // 기존 서비스 재사용
    }
}


