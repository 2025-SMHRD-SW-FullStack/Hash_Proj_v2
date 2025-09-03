package com.meonjeo.meonjeo.qna;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "qna",
        indexes = {
                @Index(name = "idx_qna_user", columnList = "user_id"),
                @Index(name = "idx_qna_admin", columnList = "admin_id"),
                @Index(name = "idx_qna_status", columnList = "status")
        }
)
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Qna {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 문의 작성자(사용자) */
    @Column(name = "user_id", nullable = false)
    @Comment("문의 작성자 userId")
    private Long userId;

    @Size(max = 30) @NotBlank
    @Column(name = "user_nickname", length = 30, nullable = false)
    @Comment("문의 작성자 닉네임")
    private String userNickname;

    /** 답변 관리자 */
    @Column(name = "admin_id")
    @Comment("답변한 관리자 userId (nullable)")
    private Long adminId;

    @Column(name = "admin_nickname", length = 30)
    @Comment("답변 관리자 닉네임")
    private String adminNickname;

    @Column(name = "role", length = 20)
    @Comment("작성자 역할(USER/SELLER 등)")
    private String role;

    /** 문의 본문 */
    @Size(max = 2000) @NotBlank
    @Column(name = "title", length = 2000, nullable = false)
    @Comment("문의 제목")
    private String title;

    @Lob
    @NotBlank
    @Comment("문의 내용")
    @Column(name = "content", columnDefinition = "LONGTEXT", nullable = false)
    private String content;

    /** 진행 상태 */
    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    @Comment("상태 (WAITING/ANSWERED/CLOSED)")
    private QnaStatus status;

    /** 답변 */
    @Lob
    @Comment("관리자 답변 내용")
    @Column(name = "answer_content", columnDefinition = "LONGTEXT")
    private String answerContent;

    @Comment("답변 작성 시각")
    private LocalDateTime answeredAt;

    /** 생성/수정 시간 */
    @Comment("문의 작성 시각")
    private LocalDateTime createdAt;

    @Comment("문의 수정 시각")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
        if (this.status == null) this.status = QnaStatus.WAITING;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
