package com.meonjeo.meonjeo.file;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UploadService {

    private final StorageClient storage;

    public List<UploadResponse> upload(ImageType type, List<MultipartFile> files) {
        ImageValidator.validate(files);

        List<UploadResponse> out = new ArrayList<>();
        for (MultipartFile f : files) {
            try (var in = f.getInputStream()) {
                String ext = FileNamePolicy.ext(f.getOriginalFilename());
                String key = FileNamePolicy.datedPath(type, ext);
                String url = storage.save(type, key, in, f.getSize());
                out.add(new UploadResponse(url, f.getOriginalFilename(), f.getSize()));
            } catch (Exception e) {
                throw new RuntimeException("UPLOAD_FAILED", e);
            }
        }
        return out;
    }
}
