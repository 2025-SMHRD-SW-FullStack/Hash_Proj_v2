package com.meonjeo.meonjeo.survey;

import com.meonjeo.meonjeo.survey.dto.SurveyTemplateResponse;
import java.util.List;
import static com.meonjeo.meonjeo.survey.QuestionType.*;

public final class SurveyCatalog {
    private SurveyCatalog() {}

    public static SurveyTemplateResponse templateOf(String productCategory) {
        String cat = (productCategory == null) ? "GENERAL" : productCategory.toUpperCase();

        return switch (cat) {
            case "ELECTRONICS", "전자제품" -> new SurveyTemplateResponse(cat, List.of(
                    q("ELEC_SETUP_EASE","설치/초기 설정 난이도", SCALE_1_5, true),
                    q("ELEC_PERFORMANCE","성능(속도/처리능력)",    SCALE_1_5, true),
                    q("ELEC_BATTERY_EFF","배터리/전력 효율",     SCALE_1_5, true),
                    qc("ELEC_HEAT_NOISE","발열/소음 수준", List.of(
                            opt("VERY_HIGH","매우 높음"), opt("HIGH","높음"), opt("MID","보통"),
                            opt("LOW","낮음"), opt("VERY_LOW","매우 낮음"), opt("NA","해당없음")
                    ))
            ));
            case "COSMETICS", "화장품" -> new SurveyTemplateResponse(cat, List.of(
                    q("COS_TEXTURE","촉감/발림성", SCALE_1_5, true),
                    q("COS_SCENT","향",           SCALE_1_5, true),
                    qc("COS_IRRITATION","자극/트러블", List.of(
                            opt("NONE","없음"), opt("SLIGHT","약간"), opt("MID","보통"),
                            opt("SEVERE","심함"), opt("NA","해당없음")
                    )),
                    q("COS_LONGEVITY","지속력", SCALE_1_5, true),
                    qc("COS_REPURCHASE","재구매 의향", List.of(
                            opt("YES","예"), opt("NO","아니오"), opt("MAYBE","미정")
                    ))
            ));
            case "PLATFORM", "무형자산", "플랫폼" -> new SurveyTemplateResponse(cat, List.of(
                    q("PLAT_SIGNUP_EASE","가입/사용성 편의", SCALE_1_5, false),
                    q("PLAT_SPEED_STABILITY","속도/안정성", SCALE_1_5, false),
                    q("PLAT_FEATURE_FIT","기능 합성(니즈 충족)", SCALE_1_5, false),
                    qc("PLAT_BUG_FREQ","오류/버그 빈도", List.of(
                            opt("NONE","없음"), opt("RARE","드묾"), opt("SOMETIMES","가끔"), opt("OFTEN","자주")
                    )),
                    q("PLAT_SUPPORT_QUALITY","고객지원/가이드 품질", SCALE_1_5, false)
            ));
            case "MEALKIT", "밀키트" -> new SurveyTemplateResponse(cat, List.of(
                    q("MEAL_TASTE","맛", SCALE_1_5, false),
                    qc("MEAL_AMOUNT","양", List.of(
                            opt("SMALL","적음"), opt("JUST_RIGHT","적당함"), opt("LARGE","많음")
                    )),
                    q("MEAL_FRESHNESS","신선도/재료 품질", SCALE_1_5, false),
                    q("MEAL_COOK_GUIDE","조리 시간·난이도 안내 정확성", SCALE_1_5, false),
                    q("MEAL_PACKAGING","포장 상태(누수/파손)", SCALE_1_5, false),
                    qc("MEAL_SPICINESS","맵기 정도", List.of(
                            opt("MILD","순함"), opt("MEDIUM","적당함"), opt("HOT","매움"), opt("NA","해당없음")
                    )),
                    qc("MEAL_REPURCHASE","재구매 의향", List.of(
                            opt("YES","예"), opt("NO","아니오"), opt("MAYBE","미정")
                    ))
            ));
            default -> new SurveyTemplateResponse("GENERAL", List.of(
                    q("GEN_PRICE","가격 만족도", SCALE_1_5, false),
                    q("GEN_NPS","추천 의향(NPS)", SCALE_1_5, false)
            ));
        };
    }

    private static SurveyTemplateResponse.Question q(String code, String label, QuestionType t, boolean allowNa) {
        return new SurveyTemplateResponse.Question(code, label, t, allowNa, null);
    }
    private static SurveyTemplateResponse.Question qc(String code, String label, List<SurveyTemplateResponse.Option> opts) {
        return new SurveyTemplateResponse.Question(code, label, CHOICE_ONE, false, opts);
    }
    private static SurveyTemplateResponse.Option opt(String v, String l) { return new SurveyTemplateResponse.Option(v,l); }
}
