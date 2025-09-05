package com.meonjeo.meonjeo.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.meonjeo.meonjeo.feedback.Feedback;
import com.meonjeo.meonjeo.feedback.FeedbackRepository;
import com.meonjeo.meonjeo.order.Order;
import com.meonjeo.meonjeo.order.OrderRepository;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.survey.*;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiDailySummaryService {

    private final AiDailySummaryRepository dailyRepo;
    private final ProductRepository productRepo;
    private final OrderRepository orderRepo;
    private final FeedbackRepository feedbackRepo;
    private final FeedbackSurveyAnswerRepository ansRepo;
    private final SurveyQuestionRepository qRepo;
    private final SurveyTemplateRepository tplRepo;
    private final SurveyTemplateQuestionRepository tplQRepo;
    private final SurveyOptionRepository optRepo;
    private final PreFeedbackSurveyRepository preRepo;
    private final UserRepository userRepo;

    private final ObjectMapper om = new ObjectMapper();
    private final RestTemplate http = new RestTemplate();

    @Value("${ai.server.base-url:http://http://localhost:8000}")
    private String aiBase;

    @Transactional
    public AiDailySummary generateIfAbsent(Long productId, LocalDate day) {
        return dailyRepo.findByProductIdAndSummaryDate(productId, day)
                .orElseGet(() -> generateNow(productId, day));
    }

    @Transactional(readOnly = true)
    public List<AiDailySummary> list(Long productId, LocalDate from, LocalDate to, Integer limit) {
        List<AiDailySummary> all = dailyRepo.findRange(productId, from, to);
        if (limit != null && limit > 0 && all.size() > limit) {
            return all.subList(0, limit);
        }
        return all;
    }

    @Transactional(readOnly = true)
    public LocalDateTime lastGeneratedAt(Long productId) {
        return dailyRepo.findLastGeneratedAt(productId);
    }

    @Transactional
    protected AiDailySummary generateNow(Long productId, LocalDate day) {
        Product p = productRepo.findById(productId).orElseThrow();
        Long sellerId = p.getSellerId();

        LocalDateTime from = day.atStartOfDay();
        LocalDateTime to   = day.plusDays(1).atStartOfDay();

        // 0) 템플릿 메타(라벨 맵)
        Map<String,String> codeToLabel = new HashMap<>();
        Map<String,Map<String,String>> codeToOptionLabel = new HashMap<>();
        tplRepo.findFirstByProductCategoryAndIsActiveOrderByVersionDesc(p.getCategory(), true)
                .ifPresent(t -> {
                    var qs = tplQRepo.findByTemplateIdOrderBySortOrderAsc(t.getId());
                    for (var tq : qs) {
                        SurveyQuestion q = qRepo.findById(tq.getQuestionId()).orElse(null);
                        if (q != null) {
                            codeToLabel.put(q.getCode(), q.getText());
                            var opts = optRepo.findByQuestionIdOrderBySortOrderAsc(q.getId());
                            Map<String,String> m = new HashMap<>();
                            for (var o : opts) m.put(o.getValueCode().toUpperCase(), o.getLabel());
                            m.putIfAbsent("NA", "무응답");
                            codeToOptionLabel.put(q.getCode(), m);
                        }
                    }
                });

        // 1) 구매자 연령 분포 (구매확정 기준)
        List<Order> confirmed = orderRepo.findConfirmedOrdersForProduct(productId, from, to);
        Set<Long> buyerIds = confirmed.stream().map(Order::getUserId).collect(Collectors.toSet());
        Map<Long, User> buyers = buyerIds.isEmpty()
                ? Map.of()
                : userRepo.findAllById(buyerIds).stream().collect(Collectors.toMap(User::getId, u -> u));

        Map<String, Long> ageBuckets = new LinkedHashMap<>();
        ageBuckets.put("10대", 0L); ageBuckets.put("20대", 0L); ageBuckets.put("30대", 0L);
        ageBuckets.put("40대", 0L); ageBuckets.put("50대+", 0L); ageBuckets.put("미상", 0L);
        int buyerSample = 0;
        ZoneId KST = ZoneId.of("Asia/Seoul");
        for (Order o : confirmed) {
            buyerSample++;
            User u = buyers.get(o.getUserId());
            if (u == null || u.getBirthDate() == null) { ageBuckets.compute("미상",(k,v)->v+1); continue; }
            int age = Period.between(u.getBirthDate(), LocalDate.now(KST)).getYears();
            String bucket = age < 20 ? "10대" : age < 30 ? "20대" : age < 40 ? "30대" : age < 50 ? "40대" : "50대+";
            ageBuckets.compute(bucket,(k,v)->v+1);
        }

        // 2) 전일 피드백(최종 게시) + 전일 사전 설문(PreFeedbackSurvey) 합산
        List<Feedback> fbs = feedbackRepo.findForProductAndPeriod(productId, from, to);
        List<PreFeedbackSurvey> pre = preRepo.findForProductAndPeriod(productId, from, to);

        // 2-1) 별점 분포(합산)
        Map<Integer, Long> starDist = new TreeMap<>();
        fbs.forEach(f -> starDist.merge(f.getOverallScore(), 1L, Long::sum));
        pre.forEach(s -> {
            if (s.getOverallScore() != null) starDist.merge(s.getOverallScore(), 1L, Long::sum);
        });
        double overallAvg = 0.0;
        long starCnt = starDist.values().stream().mapToLong(Long::longValue).sum();
        if (starCnt > 0) {
            long sum = 0;
            for (var e : starDist.entrySet()) sum += (long)e.getKey() * e.getValue();
            overallAvg = (double) sum / starCnt;
        }

        // 2-2) 문항 평균/버킷 (피드백: FeedbackSurveyAnswer, 사전설문: JSON 파싱)
        var avgRows = ansRepo.avgScaleByQuestion(productId, from, to);
        var bucketRows = ansRepo.bucketsByQuestion(productId, from, to);

        // questionId → avg
        Map<Long, Double> qAvg = new HashMap<>();
        for (Object[] r : avgRows) qAvg.put(((Number) r[0]).longValue(), ((Number) r[1]).doubleValue());

        // questionId → { code → count }
        Map<Long, Map<String, Long>> qBucketsById = new HashMap<>();
        for (Object[] r : bucketRows) {
            Long qid = ((Number) r[0]).longValue();
            String v = Objects.toString(r[1], "NA");
            Long c = ((Number) r[2]).longValue();
            qBucketsById.computeIfAbsent(qid, k -> new HashMap<>()).merge(v, c, Long::sum);
        }

        // 사전 설문(JSON)은 questionCode 기반 → 템플릿 라벨 활용
        Map<String, DoubleSummaryStatistics> codeAvgStats = new HashMap<>();
        Map<String, Map<String, Long>> codeBuckets = new HashMap<>();

        for (PreFeedbackSurvey s : pre) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = om.readValue(Objects.toString(s.getAnswersJson(), "{}"), Map.class);
                for (var e : map.entrySet()) {
                    String code = e.getKey();
                    Object val = e.getValue();
                    if (val == null) continue;

                    // SCALE 1~5 숫자면 평균에 반영
                    if (val instanceof Number) {
                        double v = ((Number) val).doubleValue();
                        codeAvgStats.computeIfAbsent(code, k -> new DoubleSummaryStatistics()).accept(v);
                    } else {
                        String v = String.valueOf(val).toUpperCase();
                        codeBuckets.computeIfAbsent(code, k -> new HashMap<>()).merge(v, 1L, Long::sum);
                    }
                }
            } catch (Exception ignore) { /* malformed json → skip */ }
        }

        // question 메타(id/code) 로딩 (id 기반 평균 + code 기반 평균을 합쳐 라벨 기준으로 병합)
        Map<String, String> labelByCode = codeToLabel; // 템플릿으로 확보

        // (로컬 메서드 금지) 옵션 라벨 맵을 주는 헬퍼 → 람다로
        final java.util.function.Function<String, Map<String,String>> optionLabel =
                c -> {
                    Map<String,String> m = codeToOptionLabel.get(c);
                    return (m == null || m.isEmpty()) ? Map.of("NA", "무응답") : m;
                };

        // byQuestionAvg (라벨 기준)
        List<Map<String,Object>> byQuestionAvg = new ArrayList<>();

        // ① id 기반 평균 (FeedbackSurveyAnswer) → code 라벨 알 수 없으면 Q<id>
        if (!qAvg.isEmpty()) {
            var ids = qAvg.keySet();
            Map<Long, SurveyQuestion> qMeta = ids.isEmpty() ? Map.of()
                    : qRepo.findAllById(ids).stream().collect(Collectors.toMap(SurveyQuestion::getId, x->x));
            for (var e : qAvg.entrySet()) {
                var q = qMeta.get(e.getKey());
                String label = (q != null) ? q.getText() : ("Q" + e.getKey());
                byQuestionAvg.add(Map.of("label", label, "average", e.getValue()));
            }
        }
        // ② code 기반 평균 (사전설문)
        for (var e : codeAvgStats.entrySet()) {
            String code = e.getKey();
            var stat = e.getValue();
            String label = labelByCode.getOrDefault(code, code);
            byQuestionAvg.add(Map.of("label", label, "average", stat.getAverage()));
        }

        // byQuestionChoice
        List<Map<String,Object>> byQuestionChoice = new ArrayList<>();
        // ① id 기반 버킷
        if (!qBucketsById.isEmpty()) {
            var ids = qBucketsById.keySet();
            Map<Long, SurveyQuestion> qMeta = ids.isEmpty() ? Map.of()
                    : qRepo.findAllById(ids).stream().collect(Collectors.toMap(SurveyQuestion::getId, x->x));
            for (var e : qBucketsById.entrySet()) {
                var q = qMeta.get(e.getKey());
                String label = (q != null) ? q.getText() : ("Q" + e.getKey());
                Map<String, Long> buckets = e.getValue();
                byQuestionChoice.add(Map.of("label", label, "buckets", buckets));
            }
        }
        // ② code 기반 버킷(사전설문)
        for (var e : codeBuckets.entrySet()) {
            String code = e.getKey();
            String label = labelByCode.getOrDefault(code, code);
            Map<String, Long> raw = e.getValue();
            Map<String,String> nameMap = optionLabel.apply(code); // ← 수정: apply
            // 라벨로 변환
            Map<String, Long> labeled = new HashMap<>();
            for (var be : raw.entrySet()) {
                String lab = nameMap.getOrDefault(be.getKey(), be.getKey());
                labeled.merge(lab, be.getValue(), Long::sum);
            }
            byQuestionChoice.add(Map.of("label", label, "buckets", labeled));
        }

        // 2-3) 전날 피드백 텍스트(최종 게시 본문만)
        List<String> fbTexts = fbs.stream()
                .map(Feedback::getContent).filter(Objects::nonNull)
                .map(String::trim).filter(s -> !s.isBlank())
                .limit(50).toList();

        // 3) 전전일 요약
        String prevFull = dailyRepo.findByProductIdAndSummaryDate(productId, day.minusDays(1))
                .map(AiDailySummary::getFullSummaryMd).orElse(null);

        // 4) AI 서버 요청
        ObjectNode payload = om.createObjectNode();
        payload.put("date", day.toString());
        payload.put("productId", productId);
        payload.put("productName", p.getName());
        payload.put("category", p.getCategory());
        payload.put("overallAvg", overallAvg);

        ObjectNode stars = payload.putObject("stars");
        for (var e : new TreeMap<>(starDist).entrySet()) stars.put(String.valueOf(e.getKey()), e.getValue());

        ObjectNode demo = payload.putObject("demographics");
        ageBuckets.forEach(demo::put);
        payload.put("buyerSample", buyerSample);

        var arrAvg = om.createArrayNode();
        for (var q : byQuestionAvg) {
            var obj = om.createObjectNode();
            obj.put("label", String.valueOf(q.get("label")));
            obj.put("average", ((Number) q.get("average")).doubleValue());
            arrAvg.add(obj);
        }
        payload.set("byQuestionAvg", arrAvg);

        var arrChoice = om.createArrayNode();
        for (var q : byQuestionChoice) {
            var obj = om.createObjectNode();
            obj.put("label", String.valueOf(q.get("label")));
            var b = om.createObjectNode();
            @SuppressWarnings("unchecked")
            Map<String, Long> m = (Map<String, Long>) q.get("buckets");
            for (var be : m.entrySet()) b.put(be.getKey(), be.getValue());
            obj.set("buckets", b);
            arrChoice.add(obj);
        }
        payload.set("byQuestionChoice", arrChoice);

        var texts = om.createArrayNode();
        fbTexts.forEach(texts::add);
        payload.set("feedbackTexts", texts);
        payload.put("previousSummary", prevFull);

        String url = aiBase.replaceAll("/+$","") + "/api/ai/summary/daily";
        HttpHeaders h = new HttpHeaders(); h.setContentType(MediaType.APPLICATION_JSON);
        ResponseEntity<Map> resp = http.postForEntity(url, new HttpEntity<>(payload, h), Map.class);
        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody()==null) {
            throw new IllegalStateException("AI 요약 호출 실패: " + resp.getStatusCode());
        }
        Map body = resp.getBody();

        AiDailySummary row = AiDailySummary.builder()
                .productId(productId)
                .sellerId(sellerId)
                .summaryDate(day)
                .headlineMd(Objects.toString(body.get("headline"), ""))
                .keyPointsJson(om.valueToTree(body.getOrDefault("keyPoints", List.of())).toString())
                .actionsJson(om.valueToTree(body.getOrDefault("actions", List.of())).toString())
                .fullSummaryMd(Objects.toString(body.get("fullSummary"), ""))
                .model(Objects.toString(body.getOrDefault("model",""), ""))
                .inputsSnapshotJson(payload.toString())
                .build();
        return dailyRepo.save(row);
    }
}
