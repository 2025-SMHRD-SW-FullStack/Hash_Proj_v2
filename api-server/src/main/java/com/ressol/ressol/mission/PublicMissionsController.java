package com.ressol.ressol.mission;

import com.ressol.ressol.mission.dto.MissionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/missions")
@RequiredArgsConstructor
@Tag(name = "공개 · 미션", description = "공개 미션 피드/상세")
public class PublicMissionsController {

    private final MissionService service;

    @Operation(summary = "공개 피드(활성 + 기간 내)")
    @GetMapping
    public Page<MissionDto> feed(@ParameterObject Pageable pageable){
        return service.listActive(pageable);
    }

    @Operation(summary = "공개 상세(활성 + 기간 내)")
    @GetMapping("/{id}")
    public MissionDto get(@PathVariable Long id){
        return service.getPublic(id);
    }
}
