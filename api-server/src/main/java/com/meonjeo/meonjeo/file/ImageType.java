package com.meonjeo.meonjeo.file;

public enum ImageType {
    PROFILE("profile"),
    EXCHANGE("exchange"),
    PRODUCT_THUMB("product/thumb"),
    PRODUCT_CONTENT("product/content"),
    AD("ad"),
    FEEDBACK("feedback"); // ✅ 추가

    private final String subdir;
    ImageType(String subdir){ this.subdir = subdir; }
    public String subdir(){ return subdir; }
}