package com.meonjeo.meonjeo.file;

import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

final class FileNamePolicy {
    static String ext(String original) {
        if (original == null) return "bin";
        int i = original.lastIndexOf('.');
        String e = (i >= 0) ? original.substring(i+1) : "bin";
        return e.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    static String datedPath(ImageType type, String ext) {
        LocalDate d = LocalDate.now();
        String name = UUID.randomUUID().toString().replace("-", "");
        return "%s/%04d/%02d/%02d/%s.%s".formatted(
                type.subdir(), d.getYear(), d.getMonthValue(), d.getDayOfMonth(), name, ext);
    }
}
