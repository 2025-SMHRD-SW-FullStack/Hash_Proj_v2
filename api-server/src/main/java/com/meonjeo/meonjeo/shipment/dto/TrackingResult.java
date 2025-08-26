package com.meonjeo.meonjeo.shipment.dto;

import java.util.List;

public record TrackingResult(String courierCode, String invoice, int currentLevel, List<TimelineEvent> events) {}
