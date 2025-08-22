package com.meonjeo.meonjeo.mission;

import com.meonjeo.meonjeo.mission.dto.MissionCreateRequest;
import com.meonjeo.meonjeo.mission.dto.MissionDto;
import com.meonjeo.meonjeo.mission.dto.MissionUpdateRequest;
import com.meonjeo.meonjeo.security.AuthSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/merchant/missions")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@Tag(name = "사장 · 미션", description = "사장 미션 생성/수정/조회")
public class MerchantMissionController {

    private final MissionService service;
    private final AuthSupport auth;

    @Operation(summary = "미션 생성(사장 제출 → PENDING)")
    @PostMapping
    public ResponseEntity<MissionDto> create(@Valid @RequestBody MissionCreateRequest req){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.create(me, req));
    }

    @Operation(summary = "미션 수정(주로 PENDING/PAUSED만 허용)")
    @PutMapping("/{id}")
    public ResponseEntity<MissionDto> update(@PathVariable Long id, @Valid @RequestBody MissionUpdateRequest req){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.update(me, id, req));
    }

    @Operation(summary = "내 회사 미션 목록")
    @GetMapping
    public Page<MissionDto> list(@RequestParam Long companyId, @ParameterObject Pageable pageable){
        Long me = auth.currentUserId();
        return service.listMine(me, companyId, pageable);
    }

    @Operation(summary = "내 미션 상세")
    @GetMapping("/{id}")
    public MissionDto get(@PathVariable Long id){
        Long me = auth.currentUserId();
        return service.getMine(me, id);
    }
}
