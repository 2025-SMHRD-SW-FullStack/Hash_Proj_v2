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

    /** Î°úÍ∑∏?∏Ìïú ?Ä?¨Ïùò userId (?πÏù∏ Í≤ÄÏ¶??¨Ìï®) */
    private Long currentSellerId(){
        Long uid = auth.currentUserId();
        if (uid == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        if (!sellerService.isApprovedSeller(uid)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "SELLER_NOT_APPROVED");
        }
        return uid;
    }

    /** ?¥Îãπ productIdÍ∞Ä ?ÑÏû¨ ?Ä???åÏú†?∏Ï? Í≤ÄÏ¶?*/
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CATEGORY_TOP?Ä categoryÍ∞Ä ?ÑÏöî?©Îãà??");
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "?¨Î°Ø ?ÜÏùå: id=" + req.slotId()));

        // ???ÅÌíà?∏Ï? ?ïÏù∏
        assertProductOwnedByMe(req.productId(), sellerId);

        // ?îí ?†Í∏à ?°Í≥† Í≤πÏπ® Ï≤¥ÌÅ¨
        if(!bookingRepo.findOverlappedForUpdate(slot.getId(), req.startDate(), req.endDate()).isEmpty()){
            throw new ResponseStatusException(HttpStatus.CONFLICT, "?¥Î? ?†Ï†ê???¨Î°Ø/Í∏∞Í∞Ñ?ÖÎãà??");
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
        if (b.getStatus() == AdBookingStatus.ACTIVE) return; // Î©±Îì±
        // ?¨Í∏∞????Î≤???Ï∂©Îèå Ï≤¥ÌÅ¨(?ôÏãú???ÄÎπ?
        if(!bookingRepo.findOverlapped(b.getSlot().getId(), b.getStartDate(), b.getEndDate()).stream()
                .allMatch(x -> Objects.equals(x.getId(), b.getId()))){
            throw new IllegalStateException("Í≤∞Ï†ú Ï§?Ï∂©Îèå Î∞úÏÉù: ?§Î•∏ ?àÏïΩ???†Ï†ê?àÏäµ?àÎã§.");
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

    // Í≤∞Ï†ú ?ïÏ†ï ???∏Ï∂ú: ?†Ï†ê Ï≤¥ÌÅ¨ ?úÎ≤à ???òÍ≥† RESERVED_PAIDÎ°??ÑÌôò
    @Transactional
    public void markPaid(Long bookingId){
        AdBooking b = bookingRepo.findById(bookingId).orElseThrow();
        if (b.getStatus() == AdBookingStatus.RESERVED_PAID || b.getStatus() == AdBookingStatus.ACTIVE) return;

        if(!bookingRepo.findOverlapped(b.getSlot().getId(), b.getStartDate(), b.getEndDate()).stream()
                .allMatch(x -> java.util.Objects.equals(x.getId(), b.getId()))){
            throw new IllegalStateException("Í≤∞Ï†ú Ï§?Ï∂©Îèå Î∞úÏÉù: ?§Î•∏ ?àÏïΩ???†Ï†ê?àÏäµ?àÎã§.");
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
        if (!editable) throw new IllegalStateException("Í≤åÏû¨ Ï§?Ï¢ÖÎ£å/Ï∑®ÏÜå ?ÅÌÉúÍ±∞ÎÇò ?úÏûë??Í≤ΩÍ≥º: ?òÏ†ï Î∂àÍ?");

        if (req.productId() != null) {
            // ?îê ???Ä???åÏú† ?ÅÌíà?∏Ï? Í≤ÄÏ¶?            
            assertProductOwnedByMe(req.productId(), sellerId);
            b.setProductId(req.productId());
        }
        if (req.bannerImageUrl() != null) {
            if (b.getSlot().getType() == AdSlotType.MAIN_ROLLING || b.getSlot().getType() == AdSlotType.MAIN_SIDE) {
                if (!req.bannerImageUrl().startsWith("http"))
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "?¨Î∞îÎ•??¥Î?ÏßÄ URL???ÑÎãô?àÎã§.");
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

        // (?†ÌÉù) productName Îß§Ìïë???ÑÏöî ?ÜÎã§Î©???Î∏îÎ°ù ?µÏß∏Î°???†ú?òÍ≥† ?ÑÎûò?êÏÑú null ?£Ïñ¥???©Îãà??
        var productIds = page.getContent().stream()
                .map(AdBooking::getProductId)
                .filter(Objects::nonNull)
                .collect(java.util.stream.Collectors.toSet());
        var products = productRepo.findAllById(productIds);
        var productNameById = new java.util.HashMap<Long, String>();
        for (var p : products) {
            try {
                var idGetter = p.getClass().getMethod("getId");
                var nameGetter = p.getClass().getMethod("getName"); // ?ÑÎ°ú?ùÌä∏???∞Îùº getTitle ?±ÏúºÎ°?Î∞îÍæ∏?∏Ïöî
                Long pid = (Long) idGetter.invoke(p);
                String name = (String) nameGetter.invoke(p);
                productNameById.put(pid, name);
            } catch (Exception ignore) { /* ?¥Î¶Ñ ?ëÍ∑º ?§Ìå® ??null ?†Ï? */ }
        }

        // 1) Î®ºÏ? DTO Î¶¨Ïä§?∏Î°ú Îß§Ìïë
        var items = page.getContent().stream()
                .map(b -> new AdminBookingItem(
                        b.getId(),
                        b.getSlot().getType(),
                        b.getSlot().getPosition(),
                        b.getSlot().getCategory(),
                        b.getSellerId(),
                        null, // shopName?Ä ?ÑÏöî ??SellerServiceÎ°?Ï±ÑÏö∞?∏Ïöî
                        b.getProductId(),
                        productNameById.get(b.getProductId()),
                        b.getStartDate(),
                        b.getEndDate(),
                        b.getStatus().name()
                ))
                .toList();

        // 2) qÍ∞Ä ?àÏúºÎ©?Î¶¨Ïä§?∏Ïóê???ÑÌÑ∞Îß?        
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
            // ?ÑÌÑ∞ÎßÅÌñà?ºÎãà totalElements???ÑÌÑ∞ÎßÅÎêú Í∞úÏàòÎ°?            
            return new PageImpl<>(filtered, sort, filtered.size());
        }

        // 3) Í≤Ä???ÜÏúºÎ©?Í∏∞Ï°¥ total ?†Ï?
        return new PageImpl<>(filtered, sort, page.getTotalElements());
    }

    /** ?Ä??+Ïπ¥ÌÖåÍ≥†Î¶¨)Î≥??¨Î°Ø Ï°∞Ìöå; ?ÜÏúºÎ©?Í∏∞Î≥∏ ?©ÎüâÎßåÌÅº ?êÎèô ?ùÏÑ±(Î©±Îì±) */
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
     * ¿¸√º ƒ´≈◊∞Ì∏Æø°º≠ »∞º∫ ¡ﬂ¿Œ øπæ‡¿ª π´¿€¿ß∑Œ ºØæÓ count∞≥ π›»Ø.
     * category=null ∑Œ ¡∂»∏«œ∏È ∏µÁ ƒ´≈◊∞Ì∏Æ¿« »∞º∫ øπæ‡¿Ã π›»ØµÀ¥œ¥Ÿ.
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
