package com.meonjeo.meonjeo.phone;

public final class PhoneFmt {
    private PhoneFmt() {}
    public static String toE164Kr(String raw) {
        if (raw == null) throw new IllegalArgumentException("phone null");
        String s = raw.replaceAll("[^0-9+]", "");
        if (s.startsWith("+")) return s;
        if (s.startsWith("0")) return "+82" + s.substring(1);
        return s;
    }
}
