package com.meonjeo.meonjeo.point.dto;

public record PointLedgerPageResponse(
        java.util.List<PointLedgerItemResponse> items, int page, int size, long totalElements, int totalPages
) {}