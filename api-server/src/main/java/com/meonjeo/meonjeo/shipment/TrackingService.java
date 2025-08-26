package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.shipment.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service @RequiredArgsConstructor
public class TrackingService {
    private final SweetTrackerClient client;

    private static final Map<Integer,String> LABEL = Map.of(
            1,"배송준비중", 2,"집화완료", 3,"배송중", 4,"지점 도착", 5,"배송출발", 6,"배송 완료"
    );

    public TrackingResult track(String courierCode, String invoice){
        Map<String,Object> res = client.trackingInfo(courierCode, invoice);
        if (Boolean.FALSE.equals(res.get("status"))) {
            throw new IllegalArgumentException(String.valueOf(res.get("msg")));
        }
        List<Map<String,Object>> details = (List<Map<String,Object>>) res.getOrDefault("trackingDetails", List.of());

        List<TimelineEvent> events = new ArrayList<>();
        int max = 1;
        for (var d : details) {
            String kind = String.valueOf(d.getOrDefault("kind",""));
            int lv = mapKind(kind);
            max = Math.max(max, lv);
            events.add(new TimelineEvent(
                    lv,
                    LABEL.get(lv),
                    String.valueOf(d.getOrDefault("timeString","")),
                    String.valueOf(d.getOrDefault("where","")),
                    kind
            ));
        }
        return new TrackingResult(courierCode, invoice, max, events);
    }

    private int mapKind(String kind){
        String k = kind == null ? "" : kind;
        if (contains(k, "상품준비","접수","출고준비","인수대기")) return 1;
        if (contains(k, "집화","픽업","접수완료")) return 2;
        if (contains(k, "이동중","간선상차","허브상차","환적","터미널상차")) return 3;
        if (contains(k, "지점도착","간선하차","허브하차","터미널도착","물류센터도착")) return 4;
        if (contains(k, "배달출발","배송출발","배달배정","배달준비")) return 5;
        if (contains(k, "배송완료","배달완료","전달완료","수취완료")) return 6;
        return 3; // 애매하면 배송중
    }
    private boolean contains(String s, String... keys){
        for (String k : keys) if (Pattern.compile(Pattern.quote(k), Pattern.CASE_INSENSITIVE).matcher(s).find()) return true;
        return false;
    }
}
