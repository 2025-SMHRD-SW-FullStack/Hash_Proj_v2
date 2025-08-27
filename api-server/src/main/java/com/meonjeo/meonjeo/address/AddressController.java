package com.meonjeo.meonjeo.address;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
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

        // 기본 주소 단일성 보장 + 최소 1개 보장
        if (req.isPrimaryAddress()) {
            repo.clearPrimaryForUser(uid);
        } else if (!repo.existsByUserIdAndPrimaryAddressTrue(uid)) {
            req.setPrimaryAddress(true);
        }
        return repo.save(req).getId();
    }

    @Operation(summary = "주소 수정", description = "주소 ID로 기존 배송지 정보를 수정합니다. 본인 소유 주소만 수정 가능.")
    @PutMapping("/{id}")
    @Transactional
    public void update(@PathVariable Long id, @Valid @RequestBody UserAddress req) {
        Long uid = currentUserId();
        UserAddress a = repo.findByIdAndUserId(id, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ADDRESS_NOT_FOUND"));

        boolean wasPrimary = a.isPrimaryAddress();
        boolean willPrimary = req.isPrimaryAddress();

        // 필드 반영
        a.setReceiver(req.getReceiver());
        a.setPhone(req.getPhone());
        a.setAddr1(req.getAddr1());
        a.setAddr2(req.getAddr2());
        a.setZipcode(req.getZipcode());

        if (willPrimary) {
            // 나를 기본으로 설정 → 나 외 모두 false
            repo.clearPrimaryExcept(uid, a.getId());
            a.setPrimaryAddress(true);
        } else {
            // 기본 해제하려는 대상이 "유일한 기본"이면 차단 (프론트에서 경고 모달 띄우면 됨)
            if (wasPrimary && repo.countByUserIdAndPrimaryAddressTrue(uid) == 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PRIMARY_REQUIRED");
            }
            a.setPrimaryAddress(false);
        }

        repo.save(a);
    }

    @Operation(summary = "주소 삭제", description = "주소 ID로 배송지를 삭제합니다. 본인 소유 주소만 삭제 가능.")
    @DeleteMapping("/{id}")
    @Transactional
    public void delete(@PathVariable Long id) {
        Long uid = currentUserId();
        UserAddress a = repo.findByIdAndUserId(id, uid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ADDRESS_NOT_FOUND"));

        boolean wasPrimary = a.isPrimaryAddress();
        repo.delete(a);

        // 기본 주소가 사라졌다면 자동 승격(방법 A)
        if (wasPrimary && repo.existsByUserId(uid) && !repo.existsByUserIdAndPrimaryAddressTrue(uid)) {
            // 최근 추가분을 기본으로 승격(원하면 Asc로 바꿔 가장 오래된걸 승격해도 됨)
            repo.findTopByUserIdOrderByIdDesc(uid).ifPresent(next -> {
                next.setPrimaryAddress(true);
                repo.save(next);
            });
        }
    }
}
