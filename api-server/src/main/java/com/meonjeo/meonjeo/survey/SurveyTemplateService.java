package com.meonjeo.meonjeo.survey;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.util.*;


@Service
@RequiredArgsConstructor
public class SurveyTemplateService {
    private final SurveyTemplateRepository templateRepo;
    private final SurveyTemplateQuestionRepository stqRepo;
    private final SurveyQuestionRepository questionRepo;
    private final SurveyOptionRepository optionRepo;
    private final ProductRepository productRepo;


    @Transactional(readOnly = true)
    public SurveyTemplateView getActiveTemplateForProduct(Long productId) {
        Product p = productRepo.findById(productId).orElseThrow();
        String category = null;
        try {
            Object cat = p.getClass().getMethod("getCategory").invoke(p);
            category = String.valueOf(cat);
        } catch (Exception ignored) {}
        if (category == null || category.isBlank()) category = "GENERAL";


        SurveyTemplate tpl = templateRepo
                .findFirstByProductCategoryAndIsActiveOrderByVersionDesc(category, true)
                .orElseGet(() -> templateRepo
                        .findFirstByProductCategoryAndIsActiveOrderByVersionDesc("GENERAL", true)
                        .orElseThrow());


        var stqs = stqRepo.findByTemplateIdOrderBySortOrderAsc(tpl.getId());
        List<SurveyQuestionView> qViews = new ArrayList<>();
        for (SurveyTemplateQuestion stq : stqs) {
            SurveyQuestion q = questionRepo.findById(stq.getQuestionId()).orElseThrow();
            var opts = optionRepo.findByQuestionIdOrderBySortOrderAsc(q.getId());
            List<SurveyOptionView> oViews = opts.stream()
                    .map(o -> new SurveyOptionView(o.getId(), o.getValueCode(), o.getLabel(), o.isNa(), o.getSortOrder()))
                    .toList();
            qViews.add(new SurveyQuestionView(q.getCode(), q.getText(), q.getType().name(), q.isAllowNa(), stq.isRequired(), oViews));
        }
        return new SurveyTemplateView(tpl.getId(), tpl.getVersion(), tpl.getProductCategory(), qViews);
    }


    // DTO: 뷰 모델
    public record SurveyTemplateView(Long templateId, int version, String productCategory, List<SurveyQuestionView> questions) {}
    public record SurveyQuestionView(String code, String text, String type, boolean allowNa, boolean required, List<SurveyOptionView> options) {}
    public record SurveyOptionView(Long optionId, String valueCode, String label, boolean isNa, int sortOrder) {}
}