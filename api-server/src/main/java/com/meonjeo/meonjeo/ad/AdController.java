package com.meonjeo.meonjeo.ad;

import com.meonjeo.meonjeo.ad.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Tag(name="파워광고")
@RestController @RequestMapping("/api/ads")
@RequiredArgsConstructor
public class AdController {

    private final AdService service;

    @Operation(summary="광고 인벤토리(가용 슬롯 조회)")
    @GetMapping("/inventory")
    public List<SlotAvailability> inventory(@RequestParam AdSlotType type,
                                            @RequestParam(required=false) String category,
                                            @RequestParam LocalDate startDate,
                                            @RequestParam LocalDate endDate){
        return service.inventory(type, category, startDate, endDate);
    }

    @Operation(summary="광고 예약(선결제 선점, 상태=RESERVED_UNPAID)")
    @PostMapping("/book")
    public BookingResponse book(@RequestBody @Valid BookingRequest req){
        return service.book(req);
    }

    // ===== 관리자: 광고 중단/재개 등 운영 컨트롤 =====

    @Operation(summary="[관리자] 광고 활성화(결제 승인 후)")
    @PostMapping("/admin/bookings/{id}/activate")
    public void activate(@PathVariable Long id){
        service.activate(id);
    }

    @Operation(summary="[관리자] 광고 중단")
    @PostMapping("/admin/bookings/{id}/cancel")
    public void cancel(@PathVariable Long id){
        service.cancel(id);
    }

    @Operation(summary="가용일 달력(비어있는 날짜만 선택 가능하게)")
    @GetMapping("/availability/calendar")
    public Set<LocalDate> calendar(@RequestParam AdSlotType type,
                                   @RequestParam(required=false) String category,
                                   @RequestParam LocalDate startDate,
                                   @RequestParam LocalDate endDate){
        return service.disabledDatesForRange(type, category, startDate, endDate);
    }

    @Operation(summary="내 광고 예약 목록(셀러)")
    @GetMapping("/me/bookings")
    public Page<BookingListItem> myBookings(@RequestParam(required=false) AdBookingStatus status,
                                            @RequestParam(required=false) java.time.LocalDate from,
                                            @RequestParam(required=false) java.time.LocalDate to,
                                            @RequestParam(defaultValue="0") int page,
                                            @RequestParam(defaultValue="10") int size) {
        Pageable pageable = PageRequest.of(Math.max(0,page), Math.min(100,size));
        return service.myBookings(status, from, to, pageable);
    }

    @Operation(summary="내 광고 상세(셀러)")
    @GetMapping("/me/bookings/{id}")
    public BookingDetail myBookingDetail(@PathVariable Long id){
        return service.myBookingDetail(id);
    }

    @Operation(summary="내 광고 수정(게재 전만 가능)")
    @PutMapping("/me/bookings/{id}")
    public BookingDetail updateMyBooking(@PathVariable Long id, @RequestBody AdBookingUpdateRequest req){
        return service.updateMyBooking(id, req);
    }

    @Operation(summary="오늘 노출할 광고 가져오기(게시용)")
    @GetMapping("/active")
    public java.util.List<ServeItem> active(@RequestParam AdSlotType type,
                                            @RequestParam(required=false) String category,
                                            @RequestParam(required=false) java.time.LocalDate date) {
        var d = (date != null) ? date : java.time.LocalDate.now();
        return service.serve(type, category, d);
    }

    @Operation(summary="전체 탭 랜덤 샘플(카테고리별 5개, 기본=25개)")
    @GetMapping("/samples/overall")
    public List<OverallSampleItem> overallSamples(@RequestParam(defaultValue="5") int perCategory,
                                                            @RequestParam(required=false) LocalDate date) {
        var d = (date != null) ? date : LocalDate.now();
        return service.sampleOverallByCategory(Math.max(1, perCategory), d);
    }

    @Operation(summary="오늘 노출 광고(빈 슬롯은 하우스 광고로 채워서 반환)")
    @GetMapping("/active/filled")
    public List<ServeItemFilled> activeFilled(@RequestParam AdSlotType type,
                                                        @RequestParam(required=false) String category,
                                                        @RequestParam(required=false) LocalDate date) {
        var d = (date != null) ? date : LocalDate.now();
        return service.serveFilled(type, category, d);
    }

}
