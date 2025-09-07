package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.shipment.dto.TimelineEvent;
import com.meonjeo.meonjeo.shipment.dto.TrackingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class SweetTrackerClient implements SweetTrackerPort {

    private final SweetTrackerProperties prop;
    private final CourierCompanyRepository courierRepo;

    private WebClient client() {
        return WebClient.builder()
                .baseUrl(prop.getBaseUrl())
                .codecs(c -> c.defaultCodecs().maxInMemorySize(2_000_000))
                .build();
    }

    public Map<String, Object> companyList() {
        return client().get()
                .uri(u -> u.path("/api/v1/companylist").queryParam("t_key", prop.getApiKey()).build())
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    public Map<String, Object> trackingInfo(String code, String invoice) {
        return client().get()
                .uri(u -> u.path("/api/v1/trackingInfo")
                        .queryParam("t_key", prop.getApiKey())
                        .queryParam("t_code", code)
                        .queryParam("t_invoice", invoice)
                        .build())
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @Override
    public TrackingResponse fetch(String courierCode, String trackingNo) {
        Map<String, Object> raw = trackingInfo(courierCode, trackingNo);

        int level = parseLevel(raw);
        List<TimelineEvent> events = mapTimeline(raw);
        // 시간 오름차순 정렬
        events = events.stream()
                .sorted(Comparator.comparing(ev -> safeParse(ev.time())))
                .collect(Collectors.toList());

        String carrierName = courierRepo.findByCode(courierCode)
                .map(CourierCompany::getName)
                .orElse(null);

        return TrackingResponse.builder()
                .currentLevel(level)
                .carrierCode(courierCode)
                .carrierName(carrierName)
                .invoiceNo(trackingNo)
                .events(events)
                .lastSyncedAt(LocalDateTime.now())
                .build();
    }

    private int parseLevel(Map<String, Object> raw) {
        Object lv = raw.get("level");
        if (lv != null) try { return Integer.parseInt(String.valueOf(lv)); } catch (Exception ignore) {}
        Object complete = raw.get("completeYN");
        if (complete != null && "Y".equalsIgnoreCase(String.valueOf(complete))) return 6;
        return 3; // 기본: 배송중
    }

    @SuppressWarnings("unchecked")
    private List<TimelineEvent> mapTimeline(Map<String, Object> raw) {
        List<TimelineEvent> out = new ArrayList<>();
        Object details = raw.get("trackingDetails");
        if (details == null) details = raw.get("scanDetails");

        if (details instanceof List<?> list) {
            for (Object o : list) {
                if (o instanceof Map<?, ?> m) {
                    String time  = str(m.get("time"));   // "2025-09-07 14:20" 등
                    String where = str(m.get("where"));
                    String kind  = str(m.get("kind"));   // 단계 텍스트
                    out.add(new TimelineEvent(
                            guessLevel(kind),             // level
                            kind,                         // label
                            time,                         // time
                            where,                        // where
                            kind                          // rawKind
                    ));
                }
            }
        }
        return out;
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }

    private static int guessLevel(String kind) {
        if (kind == null) return 3;
        String k = kind.replaceAll("\\s+", "");
        if (k.contains("배송완료")) return 6;
        if (k.contains("배송출발") || k.contains("배달출발")) return 5;
        if (k.contains("지점도착") || k.contains("허브도착") || k.contains("터미널도착")) return 4;
        if (k.contains("배송중") || k.contains("이동중") || k.contains("집화처리")) return 3;
        if (k.contains("집화완료") || k.contains("접수")) return 2;
        return 3;
    }

    private static final DateTimeFormatter[] CANDIDATES = new DateTimeFormatter[]{
            new DateTimeFormatterBuilder().appendPattern("yyyy-MM-dd HH:mm").toFormatter(),
            new DateTimeFormatterBuilder().appendPattern("yyyy.MM.dd HH:mm").toFormatter(),
            new DateTimeFormatterBuilder().appendPattern("yyyy/MM/dd HH:mm").toFormatter()
    };

    private static LocalDateTime safeParse(String s) {
        if (s == null) return LocalDateTime.MIN;
        for (DateTimeFormatter f : CANDIDATES) {
            try { return LocalDateTime.parse(s, f); } catch (Exception ignore) {}
        }
        return LocalDateTime.MIN;
    }
}
