package com.meonjeo.meonjeo.qna.dto;

import com.meonjeo.meonjeo.qna.Qna;
import com.meonjeo.meonjeo.qna.QnaStatus;
import lombok.Builder;

import java.time.LocalDateTime;

public class QnaDtos {

    // 문의 생성 요청
    public record CreateRequest(
            String title,
            String content
    ) {}

    // 문의 응답
    public record Response(
            Long id,
            String userNickname,
            String role,
            String title,
            String content,
            QnaStatus status,
            String answerContent,
            LocalDateTime answeredAt,
            LocalDateTime createdAt
    ) {
        public static Response from(Qna qna) {
            return new Response(
                    qna.getId(),
                    qna.getUserNickname(),
                    qna.getRole(),
                    qna.getTitle(),
                    qna.getContent(),
                    qna.getStatus(),
                    qna.getAnswerContent(),
                    qna.getAnsweredAt(),
                    qna.getCreatedAt()
            );
        }
    }

    // 관리자용 문의 목록 응답
    public record AdminListResponse(
            Long id,
            String userNickname,
            String role,
            String title,
            QnaStatus status,
            LocalDateTime createdAt
    ) {
        public static AdminListResponse from(Qna qna) {
            return new AdminListResponse(
                    qna.getId(),
                    qna.getUserNickname(),
                    qna.getRole(),
                    qna.getTitle(),
                    qna.getStatus(),
                    qna.getCreatedAt()
            );
        }
    }

    // 관리자용 문의 상세 응답
    public record AdminDetailResponse(
            Long id,
            String userNickname,
            String role,
            String title,
            String content,
            QnaStatus status,
            String answerContent,
            LocalDateTime answeredAt,
            LocalDateTime createdAt
    ) {
        public static AdminDetailResponse from(Qna qna) {
            return new AdminDetailResponse(
                    qna.getId(),
                    qna.getUserNickname(),
                    qna.getRole(),
                    qna.getTitle(),
                    qna.getContent(),
                    qna.getStatus(),
                    qna.getAnswerContent(),
                    qna.getAnsweredAt(),
                    qna.getCreatedAt()
            );
        }
    }

    // 답변 등록 요청
    public record AnswerRequest(
            String answerContent
    ) {}
}
