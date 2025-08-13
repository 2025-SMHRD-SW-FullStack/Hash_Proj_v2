package com.ressol.ressol.referral.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@Schema(name = "ReferralInfo", description = "내 코드/상태/내가 추천한 목록")
public class ReferralInfo {

    @Schema(description = "내 추천 코드", example = "RS-AB12CD")
    private String myCode;

    @Schema(description = "내 추천 연결 상태 (NONE/PENDING/CONFIRMED)")
    private String status;

    @Schema(description = "내가 사용한 코드(있을 때만)")
    private String usedCode;

    @Schema(description = "나를 추천한 사람 이름(있을 때만)")
    private String referrerName;

    @Schema(description = "코드 등록 시각")
    private LocalDateTime createdAt;

    @Schema(description = "추천 확정 시각")
    private LocalDateTime confirmedAt;

    @Schema(description = "내가 추천한 총 인원")
    private long totalReferees;

    @Schema(description = "그 중 확정 인원")
    private long confirmedCount;

    @Schema(description = "그 중 대기 인원")
    private long pendingCount;

    @Schema(description = "내가 추천한 사람 목록")
    private List<Referee> referees;

    @Getter
    @Builder
    public static class Referee {
        private Long userId;
        private String name;             // 닉네임 대신 name 사용
        private String status;           // PENDING/CONFIRMED
        private LocalDateTime createdAt;
        private LocalDateTime confirmedAt;
    }
}
