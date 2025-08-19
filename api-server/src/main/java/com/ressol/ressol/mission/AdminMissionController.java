package com.ressol.ressol.mission;

import com.ressol.ressol.exception.BadRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/missions")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@Tag(name = "관리자 · 미션", description = "미션 승인/반려/일시중지")
public class AdminMissionController {

    private final MissionService service;

    @Operation(summary = "미션 승인(ACTIVE)")
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> approve(@PathVariable Long id){
        service.approve(id);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "미션 반려(REJECTED)")
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> reject(@PathVariable Long id, @RequestBody(required=false) String reason){
        service.reject(id, reason == null ? "" : reason);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "미션 일시중지(PAUSED)")
    @PostMapping("/{id}/pause")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> pause(@PathVariable Long id){
        service.pause(id);
        return ResponseEntity.ok().build();
    }
}
