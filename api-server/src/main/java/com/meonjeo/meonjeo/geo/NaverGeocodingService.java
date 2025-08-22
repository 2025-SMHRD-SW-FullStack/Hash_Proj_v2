package com.meonjeo.meonjeo.geo;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NaverGeocodingService {

    @Value("${naver.map.client-id}")
    private String clientId;

    @Value("${naver.map.client-secret}")
    private String clientSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    public GeoResult geocode(String address) {
        if (address == null || address.isBlank()) return null;

        String url = UriComponentsBuilder
                .fromHttpUrl("https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode")
                .queryParam("query", URLEncoder.encode(address, StandardCharsets.UTF_8))
                .build(false)
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-NCP-APIGW-API-KEY-ID", clientId);
        headers.set("X-NCP-APIGW-API-KEY", clientSecret);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));

        ResponseEntity<Map> res = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
        Map body = res.getBody();
        if (body == null) return null;

        var addresses = (List<Map<String, Object>>) body.get("addresses");
        if (addresses == null || addresses.isEmpty()) return null;

        var first = addresses.get(0);

        Double lng = parseDouble(first.get("x"));
        Double lat = parseDouble(first.get("y"));

        String sido    = (String) first.getOrDefault("sido", null);
        String sigungu = (String) first.getOrDefault("sigungu", null);
        String dong    = (String) (first.get("dongmyun") != null ? first.get("dongmyun") : first.get("addrDetail"));

        return new GeoResult(lat, lng, sido, sigungu, dong);
    }

    private Double parseDouble(Object o) {
        if (o == null) return null;
        try { return Double.parseDouble(o.toString()); } catch (Exception e) { return null; }
    }

    public record GeoResult(Double latitude, Double longitude, String sido, String sigungu, String dong) {}
}
