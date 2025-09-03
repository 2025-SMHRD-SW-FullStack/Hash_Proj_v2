package com.meonjeo.meonjeo.qna;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QnaRepository extends JpaRepository<Qna, Long> {

    // 사용자별 문의 목록 조회
    List<Qna> findByUserIdOrderByCreatedAtDesc(Long userId);

    // 상태별 문의 목록 조회 (관리자용)
    Page<Qna> findByStatusOrderByCreatedAtDesc(QnaStatus status, Pageable pageable);

    // 제목 또는 닉네임으로 검색 (관리자용)
    @Query("SELECT q FROM Qna q WHERE " +
           "(:status IS NULL OR q.status = :status) AND " +
           "(:searchTerm IS NULL OR " +
           "LOWER(q.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(q.userNickname) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
           "ORDER BY q.createdAt DESC")
    Page<Qna> findByStatusAndSearchTerm(
            @Param("status") QnaStatus status,
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );

    // 전체 문의 목록 조회 (관리자용)
    @Query("SELECT q FROM Qna q WHERE " +
           "(:searchTerm IS NULL OR " +
           "LOWER(q.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(q.userNickname) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
           "ORDER BY q.createdAt DESC")
    Page<Qna> findAllWithSearch(
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );
}
