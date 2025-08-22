package com.meonjeo.meonjeo.merchant;

import com.meonjeo.meonjeo.merchant.dto.ChannelDto;
import com.meonjeo.meonjeo.merchant.dto.ChannelUpsertRequest;
import com.meonjeo.meonjeo.security.AuthSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/merchant/companies/{companyId}/channels")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
@Tag(name = "사장 · 채널", description = "사장 채널(오프라인 지점/온라인 스토어) 관리")
public class MerchantChannelController {

    private final CompanyChannelService service;
    private final AuthSupport auth;

    @Operation(summary = "채널 생성(오프라인 지점/온라인 스토어)")
    @PostMapping
    public ResponseEntity<ChannelDto> create(@PathVariable Long companyId,
                                             @Valid @RequestBody ChannelUpsertRequest req){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.create(me, companyId, req));
    }

    @Operation(summary = "채널 수정")
    @PutMapping("/{channelId}")
    public ResponseEntity<ChannelDto> update(@PathVariable Long companyId,
                                             @PathVariable Long channelId,
                                             @Valid @RequestBody ChannelUpsertRequest req){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.update(me, companyId, channelId, req));
    }

    @Operation(summary = "채널 목록")
    @GetMapping
    public ResponseEntity<List<ChannelDto>> list(@PathVariable Long companyId){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.list(me, companyId));
    }

    @Operation(summary = "채널 비활성화")
    @PostMapping("/{channelId}/deactivate")
    public ResponseEntity<Void> deactivate(@PathVariable Long companyId,
                                           @PathVariable Long channelId){
        Long me = auth.currentUserId();
        service.deactivate(me, companyId, channelId);
        return ResponseEntity.ok().build();
    }
}
