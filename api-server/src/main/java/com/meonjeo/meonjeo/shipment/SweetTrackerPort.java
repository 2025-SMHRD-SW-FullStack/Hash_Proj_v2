package com.meonjeo.meonjeo.shipment;

import com.meonjeo.meonjeo.shipment.dto.TrackingResponse;

public interface SweetTrackerPort {
    TrackingResponse fetch(String courierCode, String trackingNo);
}
