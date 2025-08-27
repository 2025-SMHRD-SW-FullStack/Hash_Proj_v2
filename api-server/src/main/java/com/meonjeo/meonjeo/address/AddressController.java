package com.meonjeo.meonjeo.address;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.meonjeo.meonjeo.security.AuthSupport;

import java.util.List;

@Tag(name="주소록")
@RestController
@RequestMapping("/api/me/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final UserAddressRepository repo;
    private final AuthSupport auth;

    private Long currentUserId() { return auth.currentUserId(); }

    @Operation(summary = "내 주소 목록 조회", description = "로그인 사용자의 배송지 목록을 최신순으로 반환합니다.")
    @GetMapping
    public List<UserAddress> list() {
        return repo.findByUserIdOrderByIdDesc(currentUserId());
    }

    @Operation(summary = "주소 추가", description = "로그인 사용자 주소록에 새 배송지를 추가합니다.")
    @PostMapping
    @Transactional
    public Long create(
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "추가할 주소 정보",
                    required = true,
                    content = @Content(
                            schema = @Schema(implementation = UserAddress.class),
                            examples = @ExampleObject(
                                    name = "예시",
                                    value = """
                                    {
                                      "receiver": "홍길동",
                                      "phone": "01012345678",
                                      "addr1": "서울시 강남구 테헤란로 123",
                                      "addr2": "101동 1001호",
                                      "zipcode": "06234",
                                      "primaryAddress": true
                                    }
                                    """
                            )
                    )
            )
            @Valid @RequestBody UserAddress req
    ) {
        Long uid = currentUserId();
        req.setId(null);
        req.setUserId(uid);

        // 기본 주소 단일성 보장
        if (Boolean.TRUE.equals(req.isPrimaryAddress())) {
            repo.clearPrimaryForUser(uid);
        } else if (!repo.existsByUserIdAndPrimaryAddressTrue(uid)) {
            // 아직 기본주소가 하나도 없으면 자동으로 기본 지정
            req.setPrimaryAddress(true);
        }
        return repo.save(req).getId();
    }

    @Operation(summary = "주소 수정", description = "주소 ID로 기존 배송지 정보를 수정합니다. 본인 소유 주소만 수정 가능.")
    @PutMapping("/{id}")
    @Transactional
    public void update(@PathVariable Long id, @Valid @RequestBody UserAddress req) {
        Long uid = currentUserId();
        UserAddress a = repo.findByIdAndUserId(id, uid).orElseThrow(() -> new IllegalArgumentException("ADDRESS_NOT_FOUND"));

        a.setReceiver(req.getReceiver());
        a.setPhone(req.getPhone());
        a.setAddr1(req.getAddr1());
        a.setAddr2(req.getAddr2());
        a.setZipcode(req.getZipcode());

        boolean becomingPrimary = req.isPrimaryAddress();
        if (becomingPrimary) {
            repo.clearPrimaryExcept(uid, a.getId());
        }
        a.setPrimaryAddress(becomingPrimary);
        repo.save(a);
    }

    @Operation(summary = "주소 삭제", description = "주소 ID로 배송지를 삭제합니다. 본인 소유 주소만 삭제 가능.")
    @DeleteMapping("/{id}")
    @Transactional
    public void delete(@PathVariable Long id) {
        Long uid = currentUserId();
        UserAddress a = repo.findByIdAndUserId(id, uid).orElseThrow(() -> new IllegalArgumentException("ADDRESS_NOT_FOUND"));
        boolean wasPrimary = a.isPrimaryAddress();
        repo.delete(a);

        // 기본 주소가 사라졌다면 가장 최근 주소를 기본으로 승격
        if (wasPrimary) {
            repo.findTopByUserIdOrderByIdDesc(uid).ifPresent(next -> {
                next.setPrimaryAddress(true);
                repo.save(next);
            });
        }
    }
}
