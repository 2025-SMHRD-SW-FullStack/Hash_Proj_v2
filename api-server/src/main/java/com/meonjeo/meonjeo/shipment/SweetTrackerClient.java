package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.shipment.dto.TrackingEvent;
import com.meonjeo.meonjeo.shipment.dto.TrackingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class SweetTrackerClient implements SweetTrackerPort {

    private final SweetTrackerProperties prop;

    private WebClient client() {
        return WebClient.builder()
                .baseUrl(prop.getBaseUrl())
                .codecs(c -> c.defaultCodecs().maxInMemorySize(2_000_000))
                .build();
    }

    // ===== Raw 호출 =====
    public Map<String, Object> companyList() {
        return client().get()
                .uri(u -> u.path("/api/v1/companylist")
                        .queryParam("t_key", prop.getApiKey())
                        .build())
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

    // ===== Port 구현 =====
    @Override
    public TrackingResponse fetch(String courierCode, String trackingNo) {
        Map<String, Object> raw = trackingInfo(courierCode, trackingNo);

        // ---- 여기부터 DTO 매핑 ----
        // SweetTracker 응답 스키마가 프로젝트 DTO랑 1:1 매칭이 아니라서,
        // 우선 최대한 안전하게 level 과 이벤트만 뽑아서 채움.
        int level = parseLevel(raw);

        // events: 응답의 "trackingDetails" 혹은 "scanDetails" 배열을 찾아서 변환
        List<TrackingEvent> events = mapEvents(raw);

        // ✅ 아래 생성/빌더는 프로젝트 DTO 정의에 맞춰 하나만 사용하세요.
        // (A) Lombok @Builder 있는 경우:
        try {
            return TrackingResponse.builder()
                    .currentLevel(level)
                    .trackingNo(trackingNo)     // DTO에 필드명이 다르면 맞춰주세요
                    .events(events)
                    .lastSyncedAt(LocalDateTime.now())
                    .build();
        } catch (Throwable ignore) {
            // (B) 생성자(record) 형태인 경우: 생성자 시그니처에 맞게 교체
            throw new UnsupportedOperationException(
                    "TrackingResponse 생성 방식에 맞게 fetch()의 리턴 객체 생성 부분을 한 줄만 남기고 수정하세요.");
        }
    }

    private int parseLevel(Map<String, Object> raw) {
        Object lv = raw.get("level");                 // 숫자/문자 모두 고려
        if (lv != null) {
            try { return Integer.parseInt(String.valueOf(lv)); } catch (Exception ignore) {}
        }
        // completeYN = Y 이면 6(배송완료)로 취급
        Object complete = raw.get("completeYN");
        if (complete != null && "Y".equalsIgnoreCase(String.valueOf(complete))) {
            return 6;
        }
        // fallback: 이동중으로 간주
        return 3;
    }

    @SuppressWarnings("unchecked")
    private List<TrackingEvent> mapEvents(Map<String, Object> raw) {
        List<TrackingEvent> out = new ArrayList<>();

        Object details = raw.get("trackingDetails");
        if (details == null) details = raw.get("scanDetails"); // 다른 키명 대비

        if (details instanceof List<?> list) {
            for (Object o : list) {
                if (o instanceof Map<?, ?> m) {
                    String time = str(m.get("time"));           // "2025-08-25 13:40" 같은 포맷일 수 있음
                    String where = str(m.get("where"));
                    String kind = str(m.get("kind"));           // 상태 텍스트
                    String tel  = str(m.get("tel"));            // 선택
                    // DTO 필드명에 맞춰 적절히 매핑
                    try {
                        out.add(TrackingEvent.builder()
                                .timeText(time)
                                .location(where)
                                .statusText(kind)
                                .extra(tel)
                                .build());
                    } catch (Throwable ignore) {
                        // 빌더가 없다면 생성자(record)에 맞게 변경
                    }
                }
            }
        }
        return out;
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
}
