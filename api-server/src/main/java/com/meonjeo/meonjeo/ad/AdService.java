package com.meonjeo.meonjeo.ad;

import com.meonjeo.meonjeo.ad.dto.*;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.security.AuthSupport;
import com.meonjeo.meonjeo.seller.SellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

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

    /** 로그?�한 ?�?�의 userId (?�인 검�??�함) */
    private Long currentSellerId(){
        Long uid = auth.currentUserId();
        if (uid == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        if (!sellerService.isApprovedSeller(uid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "SELLER_NOT_APPROVED");
        }
        return uid;
    }

    /** ?�당 productId가 ?�재 ?�???�유?��? 검�?*/
    private void assertProductOwnedByMe(Long productId, Long mySellerId){
        if (productId == null) return;
        var p = productRepo.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND"));
        if (!Objects.equals(p.getSellerId(), mySellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "NOT_OWNER_OF_PRODUCT");
        }
    }

    @Transactional
    public List<SlotAvailability> inventory(AdSlotType type, String category, LocalDate start, LocalDate end){
        if (type == AdSlotType.CATEGORY_TOP && (category == null || category.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CATEGORY_TOP?� category가 ?�요?�니??");
        }

        List<AdSlot> slots = slotsOrProvision(type, category);

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "?�롯 ?�음: id=" + req.slotId()));

        // ???�품?��? ?�인
        assertProductOwnedByMe(req.productId(), sellerId);

        // ?�� ?�금 ?�고 겹침 체크
        if(!bookingRepo.findOverlappedForUpdate(slot.getId(), req.startDate(), req.endDate()).isEmpty()){
            throw new ResponseStatusException(HttpStatus.CONFLICT, "?��? ?�점???�롯/기간?�니??");
        }

        int price = pricePolicy.computePrice(slot.getType(), req.startDate(), req.endDate());
        var b = bookingRepo.save(AdBooking.builder()
                .slot(slot).sellerId(sellerId)
                .productId(req.productId())
                .startDate(req.startDate()).endDate(req.endDate())
                .price(price).status(AdBookingStatus.RESERVED_UNPAID)
                .bannerImageUrl(req.bannerImageUrl())
                .title(req.title())
                .description(req.description())
                .build());
        return new BookingResponse(b.getId(), b.getPrice(), b.getStatus().name());
    }

    @Transactional
    public void activate(Long bookingId){
        AdBooking b = bookingRepo.findById(bookingId).orElseThrow();
        if (b.getStatus() == AdBookingStatus.ACTIVE) return; // 멱등
        // ?�기????�???충돌 체크(?�시???��?
        if(!bookingRepo.findOverlapped(b.getSlot().getId(), b.getStartDate(), b.getEndDate()).stream()
                .allMatch(x -> Objects.equals(x.getId(), b.getId()))){
            throw new IllegalStateException("결제 �?충돌 발생: ?�른 ?�약???�점?�습?�다.");
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

    // 결제 ?�정 ???�출: ?�점 체크 ?�번 ???�고 RESERVED_PAID�??�환
    @Transactional
    public void markPaid(Long bookingId){
        AdBooking b = bookingRepo.findById(bookingId).orElseThrow();
        if (b.getStatus() == AdBookingStatus.RESERVED_PAID || b.getStatus() == AdBookingStatus.ACTIVE) return;

        if(!bookingRepo.findOverlapped(b.getSlot().getId(), b.getStartDate(), b.getEndDate()).stream()
                .allMatch(x -> java.util.Objects.equals(x.getId(), b.getId()))){
            throw new IllegalStateException("결제 �?충돌 발생: ?�른 ?�약???�점?�습?�다.");
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

    @Transactional
    public Set<LocalDate> disabledDatesForRange(AdSlotType type, String category,
                                                LocalDate from, LocalDate to) {
        List<AdSlot> slots = slotsOrProvision(type, category);

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
        if (!editable) throw new IllegalStateException("게재 �?종료/취소 ?�태거나 ?�작??경과: ?�정 불�?");

        if (req.productId() != null) {
            // ?�� ???�???�유 ?�품?��? 검�?            
            assertProductOwnedByMe(req.productId(), sellerId);
            b.setProductId(req.productId());
        }
        if (req.bannerImageUrl() != null) {
            if (b.getSlot().getType() == AdSlotType.MAIN_ROLLING || b.getSlot().getType() == AdSlotType.MAIN_SIDE) {
                if (!req.bannerImageUrl().startsWith("http"))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "?�바�??��?지 URL???�닙?�다.");
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

    @Transactional
    public List<ServeItemFilled> serveFilled(AdSlotType type, String category, LocalDate date) {
        var slots = slotsOrProvision(type, category);

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

    @Transactional(readOnly = true)
    public Page<AdminBookingItem> adminBookings(String q, AdBookingStatus status, Pageable pageable) {
        var sort = PageRequest.of(
                Math.max(0, pageable.getPageNumber()),
                Math.min(200, pageable.getPageSize()),
                Sort.by(Sort.Direction.DESC, "id")
        );

        Page<AdBooking> page = (status != null)
                ? bookingRepo.findByStatus(status, sort)
                : bookingRepo.findAll(sort);

        // (?�택) productName 매핑???�요 ?�다�???블록 ?�째�???��?�고 ?�래?�서 null ?�어???�니??
        var productIds = page.getContent().stream()
                .map(AdBooking::getProductId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        var products = productRepo.findAllById(productIds);
        var productNameById = new java.util.HashMap<Long, String>();
        for (var p : products) {
            try {
                var idGetter = p.getClass().getMethod("getId");
                var nameGetter = p.getClass().getMethod("getName"); // ?�로?�트???�라 getTitle ?�으�?바꾸?�요
                Long pid = (Long) idGetter.invoke(p);
                String name = (String) nameGetter.invoke(p);
                productNameById.put(pid, name);
            } catch (Exception ignore) { /* ?�름 ?�근 ?�패 ??null ?��? */ }
        }

        // 1) 먼�? DTO 리스?�로 매핑
        var items = page.getContent().stream()
                .map(b -> new AdminBookingItem(
                        b.getId(),
                        b.getSlot().getType(),
                        b.getSlot().getPosition(),
                        b.getSlot().getCategory(),
                        b.getSellerId(),
                        null, // shopName?� ?�요 ??SellerService�?채우?�요
                        b.getProductId(),
                        productNameById.get(b.getProductId()),
                        b.getStartDate(),
                        b.getEndDate(),
                        b.getStatus().name()
                ))
                .toList();

        // 2) q가 ?�으�?리스?�에???�터�?        
        java.util.List<AdminBookingItem> filtered = items;
        if (q != null && !q.isBlank()) {
            String qq = q.toLowerCase();
            filtered = items.stream()
                    .filter(item ->
                            (item.productName() != null && item.productName().toLowerCase().contains(qq)) ||
                                    (item.shopName() != null && item.shopName().toLowerCase().contains(qq)) ||
                                    String.valueOf(item.sellerId()).contains(qq)
                    )
                    .toList();
            // ?�터링했?�니 totalElements???�터링된 개수�?            
            return new PageImpl<>(filtered, sort, filtered.size());
        }

        // 3) 검???�으�?기존 total ?��?
        return new PageImpl<>(filtered, sort, page.getTotalElements());
    }

    /** ?�??+카테고리)�??�롯 조회; ?�으�?기본 ?�량만큼 ?�동 ?�성(멱등) */
    private List<AdSlot> slotsOrProvision(AdSlotType type, String category) {
        List<AdSlot> slots = (type == AdSlotType.CATEGORY_TOP)
                ? slotRepo.findByTypeAndCategoryOrderByPositionAsc(type, category)
                : slotRepo.findByTypeOrderByPositionAsc(type);
        if (!slots.isEmpty()) return slots;

        final int capacity = switch (type) {
            case MAIN_ROLLING   -> 10;
            case MAIN_SIDE      -> 3;
            case CATEGORY_TOP   -> 5;
            case ORDER_COMPLETE -> 5;
        };
        for (int pos = 1; pos <= capacity; pos++) {
            slotRepo.save(AdSlot.builder()
                    .type(type)
                    .position(pos)
                    .category(type == AdSlotType.CATEGORY_TOP ? category : null)
                    .build());
        }
        return (type == AdSlotType.CATEGORY_TOP)
                ? slotRepo.findByTypeAndCategoryOrderByPositionAsc(type, category)
                : slotRepo.findByTypeOrderByPositionAsc(type);
    }

    /**
     * ��ü ī�װ����� Ȱ�� ���� ������ �������� ���� count�� ��ȯ.
     * category=null �� ��ȸ�ϸ� ��� ī�װ��� Ȱ�� ������ ��ȯ�˴ϴ�.
     */
    public List<ServeItem> randomActive(
            AdSlotType type,
            int count,
            LocalDate date
    ) {
        var list = bookingRepo.findActiveFor(type, null, date);
        Collections.shuffle(list, ThreadLocalRandom.current());
        int take = Math.min(Math.max(1, count), list.size());
        List<ServeItem> out = new ArrayList<>();
        for (int i = 0; i < take; i++) {
            var b = list.get(i);
            out.add(new ServeItem(
                    b.getSlot().getId(),
                    b.getSlot().getPosition(),
                    b.getProductId(),
                    b.getBannerImageUrl()
            ));
        }
        return out;
    }

}
