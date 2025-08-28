package com.meonjeo.meonjeo.shipping;

import com.meonjeo.meonjeo.shipping.ShippingEventIngestService.IngestEventRequest;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Tag(name = "배송 이벤트 인제스트/웹훅")
@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
public class ShippingWebhookController {

    private final ShippingEventIngestService ingestService;

    @PostMapping("/events")
    public Long ingest(@RequestBody IngestEventRequest req) {
        return ingestService.ingest(req);
    }

    @PostMapping("/webhooks/sweettracker")
    public void sweetTracker(@RequestBody Map<String, Object> body) {
        Long orderId  = asLong(body.get("orderId"));
        String code   = asStr(body.getOrDefault("carrierCode", body.get("code")));
        String inv    = asStr(body.getOrDefault("trackingNo", body.getOrDefault("invoiceNo", body.get("invoice"))));
        String sCode  = asStr(body.get("statusCode"));
        String sText  = asStr(body.getOrDefault("statusText", body.get("kind")));
        String loc    = asStr(body.getOrDefault("location", body.get("where")));
        String desc   = asStr(body.get("message"));
        LocalDateTime when = parseTime(body.get("occurredAt"), body.get("time"));

        ingestService.ingest(new IngestEventRequest(
                orderId, code, null, inv, sCode, sText, loc, desc, when
        ));
    }

    private static String asStr(Object o){ return o==null? null : String.valueOf(o); }
    private static Long asLong(Object o){
        if (o instanceof Number n) return n.longValue();
        try { return o==null? null : Long.parseLong(String.valueOf(o)); } catch (Exception e){ return null; }
    }
    private static LocalDateTime parseTime(Object... cands){
        for (Object c : cands){
            if (c == null) continue;
            String s = String.valueOf(c).trim();
            try { return LocalDateTime.parse(s, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")); } catch (Exception ignore){}
            try { return LocalDateTime.parse(s); } catch (Exception ignore){}
        }
        return LocalDateTime.now();
    }
}
