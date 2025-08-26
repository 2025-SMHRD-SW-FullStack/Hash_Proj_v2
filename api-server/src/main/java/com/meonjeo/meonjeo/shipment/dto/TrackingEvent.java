package com.meonjeo.meonjeo.shipment.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingEvent {
    private String timeText;
    private String location;
    private String statusText;
    private String extra;
}