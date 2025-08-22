package com.meonjeo.meonjeo.application;

import com.meonjeo.meonjeo.security.AuthSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name="사용자 · 신청", description="미션 신청/취소")
@RestController
@RequestMapping("/api")
@SecurityRequirement(name="bearerAuth")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService service;
    private final AuthSupport auth;

    @Operation(summary="미션 신청")
    @PostMapping("/missions/{id}/apply")
    public ResponseEntity<MissionApplication> apply(@PathVariable Long id){
        Long me = auth.currentUserId();
        return ResponseEntity.ok(service.apply(me, id));
    }

//    @Operation(summary="신청 취소")
//    @PostMapping("/applications/{id}/cancel")
//    public ResponseEntity<Void> cancel(@PathVariable Long id){
//        Long me = auth.currentUserId();
//        service.cancel(me, id);
//        return ResponseEntity.ok().build();
//    }
}
