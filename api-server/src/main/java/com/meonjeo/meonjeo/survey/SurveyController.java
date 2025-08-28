package com.meonjeo.meonjeo.survey;

import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.survey.dto.SurveyTemplateResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "설문 템플릿")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SurveyController {

    private final ProductRepository productRepo;

    @Operation(summary = "상품 카테고리에 맞는 설문 템플릿 조회")
    @GetMapping("/products/{productId}/survey-template")
    public SurveyTemplateResponse getTemplate(@PathVariable Long productId) {
        Product p = productRepo.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
        return SurveyCatalog.templateOf(p.getCategory());
    }
}
