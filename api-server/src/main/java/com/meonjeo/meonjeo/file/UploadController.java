package com.meonjeo.meonjeo.file;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
@Tag(name = "파일 업로드")
public class UploadController {

    private final UploadService uploadService;

    @Operation(summary = "이미지 업로드", description = "다중 이미지 업로드 후 절대 URL을 반환합니다.")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<UploadResponse> uploadImages(
            @RequestParam("type") ImageType type,
            @RequestPart("files") List<MultipartFile> files
    ) {
        return uploadService.upload(type, files);
    }
}
