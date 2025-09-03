package com.meonjeo.meonjeo.qna;

import com.meonjeo.meonjeo.qna.dto.QnaDtos.*;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QnaService {

    private final QnaRepository qnaRepository;
    private final AuthSupport authSupport;
    private final UserRepository userRepository;

    // 문의 생성
    @Transactional
    public Response create(CreateRequest request) {
        Long userId = authSupport.currentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        String userNickname = user.getNickname();
        String role = user.getRole().name();

        Qna qna = Qna.builder()
                .userId(userId)
                .userNickname(userNickname)
                .role(role)
                .title(request.title())
                .content(request.content())
                .imagesJson(request.imagesJson())
                .status(QnaStatus.WAITING)
                .build();

        Qna savedQna = qnaRepository.save(qna);
        return Response.from(savedQna);
    }

    // 내 문의 목록 조회
    public List<Response> getMyQnaList() {
        Long userId = authSupport.currentUserId();
        List<Qna> qnaList = qnaRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return qnaList.stream()
                .map(Response::from)
                .toList();
    }

    // 관리자용 문의 목록 조회
    public Page<AdminListResponse> getAdminQnaList(QnaStatus status, String searchTerm, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        
        if (status != null) {
            return qnaRepository.findByStatusAndSearchTerm(status, searchTerm, pageable)
                    .map(AdminListResponse::from);
        } else {
            return qnaRepository.findAllWithSearch(searchTerm, pageable)
                    .map(AdminListResponse::from);
        }
    }

    // 관리자용 문의 상세 조회
    public AdminDetailResponse getAdminQnaDetail(Long qnaId) {
        Qna qna = qnaRepository.findById(qnaId)
                .orElseThrow(() -> new IllegalArgumentException("QnA not found"));
        return AdminDetailResponse.from(qna);
    }

    // 답변 등록
    @Transactional
    public void answer(Long qnaId, AnswerRequest request) {
        Qna qna = qnaRepository.findById(qnaId)
                .orElseThrow(() -> new IllegalArgumentException("QnA not found"));

        if (qna.getStatus() != QnaStatus.WAITING) {
            throw new IllegalStateException("Already answered or closed");
        }

        Long adminId = authSupport.currentUserId();
        User adminUser = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));
        String adminNickname = adminUser.getNickname();

        qna.setAdminId(adminId);
        qna.setAdminNickname(adminNickname);
        qna.setAnswerContent(request.answerContent());
        qna.setStatus(QnaStatus.ANSWERED);
        qna.setAnsweredAt(LocalDateTime.now());

        qnaRepository.save(qna);
    }

    // 문의 상태 변경
    @Transactional
    public void updateStatus(Long qnaId, QnaStatus status) {
        Qna qna = qnaRepository.findById(qnaId)
                .orElseThrow(() -> new IllegalArgumentException("QnA not found"));
        qna.setStatus(status);
        qnaRepository.save(qna);
    }

    // 이미지 업로드 (간단한 구현)
    public String uploadImage(MultipartFile image) {
        try {
            // 업로드 디렉토리 생성
            String uploadDir = "uploads/qna";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // 파일명 생성
            String originalFilename = image.getOriginalFilename();
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String filename = UUID.randomUUID().toString() + extension;
            
            // 파일 저장
            Path filePath = uploadPath.resolve(filename);
            Files.copy(image.getInputStream(), filePath);
            
            return "/uploads/qna/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("이미지 업로드 실패: " + e.getMessage());
        }
    }
}
