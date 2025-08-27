package com.meonjeo.meonjeo.ad;

import com.meonjeo.meonjeo.ad.dto.*;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.seller.SellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service @RequiredArgsConstructor
public class AdService {
    private final AdSlotRepository slotRepo;
    private final AdBookingRepository bookingRepo;
    private final AdPricePolicy pricePolicy;
    private final HouseAdProvider houseAdProvider;

    // NEW
    private final ProductRepository productRepo;
    private final AuthSupport auth;
    private final SellerService sellerService;

    /** 로그인한 셀러의 userId (승인 검증 포함) */
    private Long currentSellerId(){
        Long uid = auth.currentUserId();
        if (uid == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        if (!sellerService.isApprovedSeller(uid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "SELLER_NOT_APPROVED");
        }
        return uid;
    }

    /** 해당 productId가 현재 셀러 소유인지 검증 */
    private void assertProductOwnedByMe(Long productId, Long mySellerId){
        if (productId == null) return;
        var p = productRepo.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
        if (!Objects.equals(p.getSellerId(), mySellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_OWNER_OF_PRODUCT");
        }
    }

    @Transactional(readOnly = true)
    public List<SlotAvailability> inventory(AdSlotType type, String category, LocalDate start, LocalDate end){
        if (type == AdSlotType.CATEGORY_TOP && (category == null || category.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CATEGORY_TOP은 category가 필요합니다.");
        }

        List<AdSlot> slots = (type == AdSlotType.CATEGORY_TOP)
                ? slotRepo.findByTypeAndCategoryOrderByPositionAsc(type, category)
                : slotRepo.findByTypeOrderByPositionAsc(type);

        List<SlotAvailability> out = new ArrayList<>();
        for (AdSlot s : slots) {
            boolean available = bookingRepo.findOverlapped(s.getId(), start, end).isEmpty();
            out.add(new SlotAvailability(s.getId(), Optional.ofNullable(s.getPosition()).orElse(0), available));
        }
        return out;
    }

    @Transactional
    public BookingResponse book(BookingRequest req){
        Long sellerId = currentSellerId();

        AdSlot slot = slotRepo.findById(req.slotId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "슬롯 없음: id=" + req.slotId()));

        // 내 상품인지 확인
        assertProductOwnedByMe(req.productId(), sellerId);

        // 🔒 잠금 잡고 겹침 체크
        if(!bookingRepo.findOverlappedForUpdate(slot.getId(), req.startDate(), req.endDate()).isEmpty()){
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 선점된 슬롯/기간입니다.");
        }

        int price = pricePolicy.computePrice(slot.getType(), req.startDate(), req.endDate());
        var b = bookingRepo.save(AdBooking.builder()
                .slot(slot).sellerId(sellerId)
                .productId(req.productId())
                .startDate(req.startDate()).endDate(req.endDate())
                .price(price).status(AdBookingStatus.RESERVED_UNPAID)
                .build());
        return new BookingResponse(b.getId(), b.getPrice(), b.getStatus().name());
    }

    @Transactional
    public void activate(Long bookingId){
        AdBooking b = bookingRepo.findById(bookingId).orElseThrow();
        if (b.getStatus() == AdBookingStatus.ACTIVE) return; // 멱등
        // 여기도 한 번 더 충돌 체크(동시성 대비)
        if(!bookingRepo.findOverlapped(b.getSlot().getId(), b.getStartDate(), b.getEndDate()).stream()
                .allMatch(x -> Objects.equals(x.getId(), b.getId()))){
            throw new IllegalStateException("결제 중 충돌 발생: 다른 예약이 선점했습니다.");
        }
        b.setStatus(AdBookingStatus.ACTIVE);
        bookingRepo.save(b);
    }

    @Transactional
    public void cancel(Long bookingId){
        AdBooking b = bookingRepo.findById(bookingId).orElseThrow();
        b.setStatus(AdBookingStatus.CANCELLED);
        bookingRepo.save(b);
    }

    @Transactional
    public int completeExpiredToday(){
        var today = java.time.LocalDate.now();
        var all = bookingRepo.findAll();
        int cnt = 0;
        for (var b : all){
            if (b.getStatus() == AdBookingStatus.ACTIVE && b.getEndDate().isBefore(today)){
                b.setStatus(AdBookingStatus.COMPLETED);
                bookingRepo.save(b);
                cnt++;
            }
        }
        return cnt;
    }

    // 결제 확정 시 호출: 선점 체크 한번 더 하고 RESERVED_PAID로 전환
    @Transactional
    public void markPaid(Long bookingId){
        AdBooking b = bookingRepo.findById(bookingId).orElseThrow();
        if (b.getStatus() == AdBookingStatus.RESERVED_PAID || b.getStatus() == AdBookingStatus.ACTIVE) return;

        if(!bookingRepo.findOverlapped(b.getSlot().getId(), b.getStartDate(), b.getEndDate()).stream()
                .allMatch(x -> java.util.Objects.equals(x.getId(), b.getId()))){
            throw new IllegalStateException("결제 중 충돌 발생: 다른 예약이 선점했습니다.");
        }
        b.setStatus(AdBookingStatus.RESERVED_PAID);
        bookingRepo.save(b);

        var today = java.time.LocalDate.now();
        if (!today.isBefore(b.getStartDate()) && !today.isAfter(b.getEndDate())) {
            activate(b.getId());
        }
    }

    @Transactional
    public int activateBookingsStartingToday() {
        var today = java.time.LocalDate.now();
        int cnt = 0;
        for (var b : bookingRepo.findAll()) {
            if (b.getStatus() == AdBookingStatus.RESERVED_PAID &&
                    ( !today.isBefore(b.getStartDate()) && !today.isAfter(b.getEndDate()) )) {
                activate(b.getId());
                cnt++;
            }
        }
        return cnt;
    }

    @Transactional(readOnly = true)
    public Set<LocalDate> disabledDatesForRange(AdSlotType type, String category,
                                                LocalDate from, LocalDate to) {
        List<AdSlot> slots = (type == AdSlotType.CATEGORY_TOP)
                ? slotRepo.findByTypeAndCategoryOrderByPositionAsc(type, category)
                : slotRepo.findByTypeOrderByPositionAsc(type);

        Set<LocalDate> disabled = new HashSet<>();
        for (var d = from; !d.isAfter(to); d = d.plusDays(1)) {
            boolean anyAvailable = false;
            for (AdSlot s : slots) {
                boolean overlapped = !bookingRepo.findOverlapped(s.getId(), d, d).isEmpty();
                if (!overlapped) { anyAvailable = true; break; }
            }
            if (!anyAvailable) disabled.add(d);
        }
        return disabled;
    }

    @Transactional(readOnly = true)
    public Page<BookingListItem> myBookings(AdBookingStatus status, LocalDate from, LocalDate to,
                                            Pageable pageable) {
        Long sellerId = currentSellerId();

        Page<AdBooking> page;
        if (status != null) {
            page = bookingRepo.findBySellerIdAndStatusOrderByIdDesc(sellerId, status, pageable);
        } else if (from != null && to != null) {
            page = bookingRepo.findBySellerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByIdDesc(
                    sellerId, to, from, pageable);
        } else {
            page = bookingRepo.findBySellerIdOrderByIdDesc(sellerId, pageable);
        }

        return page.map(b -> new BookingListItem(
                b.getId(),
                b.getSlot().getType(),
                b.getSlot().getPosition(),
                b.getSlot().getCategory(),
                b.getStartDate(),
                b.getEndDate(),
                b.getPrice(),
                b.getStatus().name()
        ));
    }

    @Transactional(readOnly = true)
    public BookingDetail myBookingDetail(Long id) {
        Long sellerId = currentSellerId();
        AdBooking b = bookingRepo.findById(id).orElseThrow();
        if (!Objects.equals(b.getSellerId(), sellerId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");

        var today = java.time.LocalDate.now();
        boolean editable = (b.getStatus() == AdBookingStatus.RESERVED_UNPAID || b.getStatus() == AdBookingStatus.RESERVED_PAID)
                && today.isBefore(b.getStartDate());
        Integer dday = editable ? (int) java.time.temporal.ChronoUnit.DAYS.between(today, b.getStartDate()) : null;

        return new BookingDetail(
                b.getId(),
                b.getSlot().getType(),
                b.getSlot().getPosition(),
                b.getSlot().getCategory(),
                b.getStartDate(),
                b.getEndDate(),
                b.getPrice(),
                b.getStatus().name(),
                b.getProductId(),
                b.getBannerImageUrl(),
                editable,
                dday
        );
    }

    @Transactional
    public BookingDetail updateMyBooking(Long id, AdBookingUpdateRequest req) {
        Long sellerId = currentSellerId();
        AdBooking b = bookingRepo.findById(id).orElseThrow();
        if (!Objects.equals(b.getSellerId(), sellerId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden");

        var today = java.time.LocalDate.now();
        boolean editable = (b.getStatus() == AdBookingStatus.RESERVED_UNPAID || b.getStatus() == AdBookingStatus.RESERVED_PAID)
                && today.isBefore(b.getStartDate());
        if (!editable) throw new IllegalStateException("게재 중/종료/취소 상태거나 시작일 경과: 수정 불가");

        if (req.productId() != null) {
            // 🔐 이 셀러 소유 상품인지 검증
            assertProductOwnedByMe(req.productId(), sellerId);
            b.setProductId(req.productId());
        }
        if (req.bannerImageUrl() != null) {
            if (b.getSlot().getType() == AdSlotType.MAIN_ROLLING || b.getSlot().getType() == AdSlotType.MAIN_SIDE) {
                if (!req.bannerImageUrl().startsWith("http"))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "올바른 이미지 URL이 아닙니다.");
                b.setBannerImageUrl(req.bannerImageUrl());
            } else {
                b.setBannerImageUrl(null);
            }
        }
        bookingRepo.save(b);
        return myBookingDetail(id);
    }

    @Transactional(readOnly = true)
    public List<ServeItem> serve(AdSlotType type, String category, LocalDate date) {
        var list = bookingRepo.findActiveFor(type, category, date);
        return list.stream().map(b -> new ServeItem(
                b.getSlot().getId(),
                b.getSlot().getPosition(),
                b.getProductId(),
                b.getBannerImageUrl()
        )).toList();
    }

    @Transactional(readOnly = true)
    public List<OverallSampleItem> sampleOverallByCategory(int perCategory, LocalDate date) {
        var categories = slotRepo.distinctCategories(AdSlotType.CATEGORY_TOP);
        var out = new ArrayList<OverallSampleItem>();

        for (String cat : categories) {
            var bookings = bookingRepo.findActiveFor(AdSlotType.CATEGORY_TOP, cat, date);
            Collections.shuffle(bookings, ThreadLocalRandom.current());
            int take = Math.min(perCategory, bookings.size());
            for (int i=0;i<take;i++) {
                var b = bookings.get(i);
                out.add(new OverallSampleItem(cat, b.getProductId(), false, null));
            }
            for (int i=take;i<perCategory;i++) {
                var house = houseAdProvider.houseForCategoryTop(cat);
                out.add(new OverallSampleItem(cat, null, true, house));
            }
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<ServeItemFilled> serveFilled(AdSlotType type, String category, LocalDate date) {
        var slots = (type == AdSlotType.CATEGORY_TOP)
                ? slotRepo.findByTypeAndCategoryOrderByPositionAsc(type, category)
                : slotRepo.findByTypeOrderByPositionAsc(type);

        var actives = bookingRepo.findActiveFor(type, category, date);
        var bySlotId = new HashMap<Long, AdBooking>();
        for (var b : actives) bySlotId.put(b.getSlot().getId(), b);

        var list = new ArrayList<ServeItemFilled>();
        for (var s : slots) {
            var b = bySlotId.get(s.getId());
            if (b != null) {
                list.add(new ServeItemFilled(s.getId(), s.getPosition(), b.getProductId(), false, b.getBannerImageUrl()));
            } else {
                var url = houseAdProvider.houseFor(type);
                list.add(new ServeItemFilled(s.getId(), s.getPosition(), null, true, url));
            }
        }
        return list;
    }
}
