package com.meonjeo.meonjeo.file;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Component
@ConditionalOnProperty(name = "storage.mode", havingValue = "local", matchIfMissing = true)
@RequiredArgsConstructor
public class LocalStorageClient implements StorageClient {

    @Value("${storage.local.base-dir:./uploads}")
    private String baseDir;

    @Value("${storage.public-base-url:http://localhost:7777}")
    private String publicBaseUrl;

    @Override
    public String save(ImageType type, String key, java.io.InputStream data, long size) throws Exception {
        Path root = Path.of(baseDir).toAbsolutePath().normalize();
        Path dest = root.resolve(key).normalize();
        if (!dest.startsWith(root)) throw new SecurityException("PATH_TRAVERSAL");

        Files.createDirectories(dest.getParent());
        try (OutputStream os = Files.newOutputStream(dest)) {
            data.transferTo(os);
        }
        return publicBaseUrl.replaceAll("/+$","") + "/uploads/" + key.replace("\\","/");
    }
}
