package com.meonjeo.meonjeo.feedback;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name="피드백(관리자)")
@RestController
@RequestMapping("/api/admin/feedbacks")
@RequiredArgsConstructor
public class AdminFeedbackController {

    private final FeedbackService service;

    @Operation(summary="피드백 삭제(관리자, 하드딜리트)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> remove(@PathVariable Long id) {
        service.adminDeleteHard(id);
        return ResponseEntity.noContent().build();
    }
}
