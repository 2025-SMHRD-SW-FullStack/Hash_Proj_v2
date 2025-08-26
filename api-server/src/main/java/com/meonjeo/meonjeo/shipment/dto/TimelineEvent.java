package com.meonjeo.meonjeo.shipment.dto;

public record TimelineEvent(int level, String label, String time, String where, String rawKind) {}

