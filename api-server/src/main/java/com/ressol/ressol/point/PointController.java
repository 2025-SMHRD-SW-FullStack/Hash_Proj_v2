package com.ressol.ressol.point;

import com.ressol.ressol.auth.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/me/points")
@Tag(name = "Point", description = "포인트 API")
@RequiredArgsConstructor
public class PointController {

    private final PointService pointService;

    @GetMapping("/balance")
    @Operation(summary = "내 포인트 잔액 조회")
    public ResponseEntity<Map<String, Long>> balance(@AuthenticationPrincipal CustomUserDetails me) {
        return ResponseEntity.ok(Map.of("balance", pointService.getBalance(me.getUserId())));
    }

    @PostMapping("/redeem")
    @Operation(summary = "기프티콘 교환 신청 (5,000/10,000/30,000)", description = "신청 즉시 포인트 차감됩니다.")
    public ResponseEntity<Map<String, Object>> redeem(@AuthenticationPrincipal CustomUserDetails me,
                                                      @RequestParam("amount") long amount,
                                                      @RequestParam(value = "channel", required = false) String channel,
                                                      @RequestParam(value = "note", required = false) String note) {
        Long rid = pointService.redeemGiftCard(me.getUserId(), amount, channel, note);
        return ResponseEntity.ok(Map.of("redemptionId", rid, "amount", amount));
    }
}
