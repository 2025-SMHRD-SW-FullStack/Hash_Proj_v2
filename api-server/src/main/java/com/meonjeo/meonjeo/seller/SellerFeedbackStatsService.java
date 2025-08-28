package com.meonjeo.meonjeo.seller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.feedback.Feedback;
import com.meonjeo.meonjeo.feedback.FeedbackRepository;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.seller.dto.SellerFeedbackDemographicsResponse;
import com.meonjeo.meonjeo.seller.dto.SellerFeedbackSummaryResponse;
import com.meonjeo.meonjeo.seller.dto.SellerQuestionStatsResponse;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.survey.QuestionType;
import com.meonjeo.meonjeo.survey.SurveyCatalog;
import com.meonjeo.meonjeo.survey.dto.SurveyTemplateResponse;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SellerFeedbackStatsService {

    private final ProductRepository productRepo;
    private final FeedbackRepository feedbackRepo;
    private final UserRepository userRepo;
    private final AuthSupport auth;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private Product validateAndGetProduct(Long productId) {
        Long sellerId = auth.currentUserId();
        Product p = productRepo.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
        if (!Objects.equals(p.getSellerId(), sellerId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "FORBIDDEN");
        return p;
    }
    private LocalDateTime startOf(LocalDate d) { return d==null? null : d.atStartOfDay(); }
    private LocalDateTime endExclusive(LocalDate d) { return d==null? null : d.plusDays(1).atStartOfDay(); }
    private static double round2(double v) { return Math.round(v*100.0)/100.0; }

    // --- 기존 요약 ---
    @Transactional(readOnly = true)
    public SellerFeedbackSummaryResponse summary(Long productId, LocalDate from, LocalDate to) {
        validateAndGetProduct(productId);
        var list = feedbackRepo.findForProductAndPeriod(productId, startOf(from), endExclusive(to));
        long total = list.size();
        double avg = total==0 ? 0.0 : list.stream().mapToInt(Feedback::getOverallScore).average().orElse(0.0);
        Map<Integer, Long> counts = new LinkedHashMap<>(); for (int i=1;i<=5;i++) counts.put(i,0L);
        list.forEach(f -> counts.compute(f.getOverallScore(), (k,v)-> v==null?1L:v+1L));
        return new SellerFeedbackSummaryResponse(productId, total, round2(avg), counts, from, to);
    }

    // --- 기존 인구통계 ---
    @Transactional(readOnly = true)
    public SellerFeedbackDemographicsResponse demographics(Long productId, LocalDate from, LocalDate to) {
        validateAndGetProduct(productId);
        var list = feedbackRepo.findForProductAndPeriod(productId, startOf(from), endExclusive(to));
        if (list.isEmpty()) return new SellerFeedbackDemographicsResponse(productId, List.of(), List.of(), from, to);

        Set<Long> uids = list.stream().map(Feedback::getUserId).collect(Collectors.toSet());
        Map<Long, User> userMap = userRepo.findAllById(uids).stream().collect(Collectors.toMap(User::getId,u->u));

        Map<String,List<Feedback>> byGender = new HashMap<>();
        for (Feedback f: list) {
            User u = userMap.get(f.getUserId());
            String key = (u==null || u.getGender()==null) ? "UNKNOWN" : u.getGender().name();
            byGender.computeIfAbsent(key,k->new ArrayList<>()).add(f);
        }
        var genderStats = byGender.entrySet().stream()
                .map(e -> new SellerFeedbackDemographicsResponse.GroupStat(
                        e.getKey(), e.getValue().size(),
                        round2(e.getValue().stream().mapToInt(Feedback::getOverallScore).average().orElse(0.0))
                )).sorted(Comparator.comparing(SellerFeedbackDemographicsResponse.GroupStat::key)).toList();

        LocalDate today = LocalDate.now();
        Map<String,List<Feedback>> byAge = new LinkedHashMap<>();
        for (Feedback f: list) {
            User u = userMap.get(f.getUserId());
            String bucket = ageBucket(u==null? null : u.getBirthDate(), today);
            byAge.computeIfAbsent(bucket,k->new ArrayList<>()).add(f);
        }
        List<String> order = List.of("10대","20대","30대","40대","50대","60대+","미상");
        var ageStats = order.stream().filter(byAge::containsKey).map(k -> {
            var g = byAge.get(k);
            return new SellerFeedbackDemographicsResponse.GroupStat(k, g.size(),
                    round2(g.stream().mapToInt(Feedback::getOverallScore).average().orElse(0.0)));
        }).toList();

        return new SellerFeedbackDemographicsResponse(productId, genderStats, ageStats, from, to);
    }

    // --- 신규: 항목별 집계 ---
    @Transactional(readOnly = true)
    public SellerQuestionStatsResponse questions(Long productId, LocalDate from, LocalDate to) {
        Product p = validateAndGetProduct(productId);
        var tpl = SurveyCatalog.templateOf(p.getCategory());
        var list = feedbackRepo.findForProductAndPeriod(productId, startOf(from), endExclusive(to));

        // 결과 그릇
        List<SellerQuestionStatsResponse.QuestionStat> stats = new ArrayList<>();
        // 모든 피드백 JSON 파싱 (맵 형태)
        List<Map<String,Object>> parsed = new ArrayList<>(list.size());
        for (Feedback f : list) {
            Map<String,Object> m = Map.of();
            try {
                if (f.getScoresJson()!=null && !f.getScoresJson().isBlank()) {
                    m = objectMapper.readValue(f.getScoresJson(), new TypeReference<Map<String,Object>>(){});
                }
            } catch (Exception ignore) {}
            parsed.add(m);
        }

        for (var q : tpl.questions()) {
            if (q.type()== QuestionType.SCALE_1_5) {
                long[] buckets = new long[5]; // 1..5
                long count = 0;
                long sum = 0;
                for (Map<String,Object> m : parsed) {
                    Object v = m.get(q.code());
                    Integer s = toIntOrNull(v);
                    if (s==null) {
                        if (!q.allowNa()) continue;
                    } else if (s>=1 && s<=5) {
                        buckets[s-1]++; sum += s; count++;
                    }
                }
                Map<String,Long> res = new LinkedHashMap<>();
                for (int i=1; i<=5; i++) res.put(String.valueOf(i), buckets[i-1]);
                Double avg = count==0 ? null : round2( (double)sum / count );
                stats.add(new SellerQuestionStatsResponse.QuestionStat(q.code(), q.label(), q.type(), avg, res));
            } else { // CHOICE_ONE
                Map<String,Long> res = new LinkedHashMap<>();
                if (q.options()!=null) q.options().forEach(o -> res.put(o.value(), 0L));
                // NA 버킷 보장
                if (q.allowNa() || (q.options()!=null && q.options().stream().anyMatch(o -> "NA".equalsIgnoreCase(o.value())))) {
                    res.putIfAbsent("NA", 0L);
                }
                for (Map<String,Object> m : parsed) {
                    Object v = m.get(q.code());
                    String s = (v==null) ? "NA" : String.valueOf(v).toUpperCase();
                    res.compute(s, (k, old) -> old==null ? 1L : old+1);
                }
                stats.add(new SellerQuestionStatsResponse.QuestionStat(q.code(), q.label(), q.type(), null, res));
            }
        }

        return new SellerQuestionStatsResponse(productId, tpl.category(), from, to, stats);
    }

    private static String ageBucket(LocalDate birth, LocalDate today) {
        if (birth==null) return "미상";
        int age = Period.between(birth, today).getYears();
        if (age < 20) return "10대";
        if (age < 30) return "20대";
        if (age < 40) return "30대";
        if (age < 50) return "40대";
        if (age < 60) return "50대";
        return "60대+";
    }

    private static Integer toIntOrNull(Object v) {
        if (v==null) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(v)); } catch (Exception e) { return null; }
    }
}
