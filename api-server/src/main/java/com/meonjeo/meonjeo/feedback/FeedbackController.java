package com.meonjeo.meonjeo.feedback;

import com.meonjeo.meonjeo.feedback.dto.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Tag(name="피드백")
@RestController @RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {
    private final FeedbackService service;

    @Operation(summary="피드백 작성(제출 즉시 포인트 지급, 1회 한정)")
    @PostMapping
    public FeedbackResponse create(@RequestBody @Valid FeedbackCreateRequest req) {
        return service.create(req);
    }
}
