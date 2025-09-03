package com.meonjeo.meonjeo.qna;

import com.meonjeo.meonjeo.qna.dto.QnaDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "QnA")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class QnaController {

    private final QnaService qnaService;

    // ===== 사용자용 =====

    @Operation(summary = "문의 등록")
    @PostMapping("/qna")
    public Response create(@RequestBody @Valid CreateRequest request) {
        return qnaService.create(request);
    }

    @Operation(summary = "내 문의 목록 조회")
    @GetMapping("/me/qna")
    public List<Response> getMyQnaList() {
        return qnaService.getMyQnaList();
    }

    // ===== 관리자용 =====

    @Operation(summary = "[관리자] 문의 목록 조회")
    @GetMapping("/admin/qna")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminListResponse> getAdminQnaList(
            @RequestParam(required = false) QnaStatus status,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return qnaService.getAdminQnaList(status, searchTerm, page, size);
    }

    @Operation(summary = "[관리자] 문의 상세 조회")
    @GetMapping("/admin/qna/{qnaId}")
    @PreAuthorize("hasRole('ADMIN')")
    public AdminDetailResponse getAdminQnaDetail(@PathVariable Long qnaId) {
        return qnaService.getAdminQnaDetail(qnaId);
    }

    @Operation(summary = "[관리자] 답변 등록")
    @PostMapping("/admin/qna/{qnaId}/answer")
    @PreAuthorize("hasRole('ADMIN')")
    public void answer(@PathVariable Long qnaId, @RequestBody @Valid AnswerRequest request) {
        qnaService.answer(qnaId, request);
    }

    @Operation(summary = "[관리자] 문의 상태 변경")
    @PatchMapping("/admin/qna/{qnaId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public void updateStatus(@PathVariable Long qnaId, @RequestParam QnaStatus status) {
        qnaService.updateStatus(qnaId, status);
    }
}
