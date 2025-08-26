package com.meonjeo.meonjeo.shipment.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingResponse {
    private int currentLevel;
    private String trackingNo;
    private List<TrackingEvent> events;
    private LocalDateTime lastSyncedAt;
}