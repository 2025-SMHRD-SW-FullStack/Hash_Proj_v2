// com/meonjeo/meonjeo/shipment/dto/TrackingResponse.java
package com.meonjeo.meonjeo.shipment.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TrackingResponse {
    private int currentLevel;          // 1~6
    private String carrierCode;        // ex) "04" (CJ)
    private String carrierName;        // ex) "CJ대한통운"
    private String invoiceNo;          // 표준 필드명 (기존 trackingNo 대체)
    private List<TimelineEvent> events;// 표준 이벤트(시간/장소/라벨/레벨)
    private LocalDateTime lastSyncedAt;
}
