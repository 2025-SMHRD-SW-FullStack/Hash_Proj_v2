package com.meonjeo.meonjeo.file;

import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.InputStream;
import java.util.List;

final class ImageValidator {
    static final long MAX_PER_FILE = 10L * 1024 * 1024; // 10MB
    static final long MAX_TOTAL    = 30L * 1024 * 1024; // 30MB
    static final int  MAX_PX       = 4096;

    static void validate(List<MultipartFile> files) {
        if (files == null || files.isEmpty())
            throw new IllegalArgumentException("NO_FILE");

        long total = 0;
        for (MultipartFile f : files) {
            if (f.isEmpty()) throw new IllegalArgumentException("EMPTY_FILE");
            String ct = (f.getContentType() == null) ? "" : f.getContentType().toLowerCase();
            if (!(ct.startsWith("image/")))
                throw new IllegalArgumentException("NOT_IMAGE");

            long size = f.getSize();
            if (size > MAX_PER_FILE) throw new IllegalArgumentException("FILE_TOO_LARGE");
            total += size;

            try (InputStream in = f.getInputStream()) {
                BufferedImage img = ImageIO.read(in);
                if (img != null) {
                    if (img.getWidth() > MAX_PX || img.getHeight() > MAX_PX)
                        throw new IllegalArgumentException("IMAGE_TOO_BIG");
                }
            } catch (Exception ignore) { /* best-effort */ }
        }
        if (total > MAX_TOTAL) throw new IllegalArgumentException("TOTAL_TOO_LARGE");
    }
}
