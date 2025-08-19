package com.ressol.ressol.merchant.projection;

public interface NearbyChannelRow {
    Long getId();
    Long getCompanyId();
    String getName();
    String getAddress();
    Double getLatitude();
    Double getLongitude();
    Double getDistanceKm();
}
