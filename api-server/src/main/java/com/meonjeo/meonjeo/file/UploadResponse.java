package com.meonjeo.meonjeo.file;

public record UploadResponse(
        String url,
        String originalName,
        long size
) {}
