package com.meonjeo.meonjeo.exchange;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meonjeo.meonjeo.exchange.dto.ExchangeCreateRequest;
import com.meonjeo.meonjeo.exchange.dto.ExchangeDecisionRequest;
import com.meonjeo.meonjeo.exchange.dto.ExchangeResponse;
import com.meonjeo.meonjeo.order.OrderItem;
import com.meonjeo.meonjeo.order.OrderItemRepository;
import com.meonjeo.meonjeo.product.Product;
import com.meonjeo.meonjeo.product.ProductRepository;
import com.meonjeo.meonjeo.product.ProductVariant;
import com.meonjeo.meonjeo.product.ProductVariantRepository;
import com.meonjeo.meonjeo.shipment.Shipment;
import com.meonjeo.meonjeo.shipment.ShipmentRepository;
import com.meonjeo.meonjeo.shipment.ShipmentService;
import com.meonjeo.meonjeo.shipment.ShipmentType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.meonjeo.meonjeo.exchange.ExchangeStatus.*;

@Service
@RequiredArgsConstructor
public class ExchangeService {

    private final OrderItemRepository orderItemRepo;
    private final ProductRepository productRepo;
    private final ProductVariantRepository variantRepo;
    private final OrderExchangeRepository exchangeRepo;
    private final ShipmentRepository shipmentRepo;
    private final ShipmentService shipmentService;
    private final ObjectMapper objectMapper;

    private static final EnumSet<ExchangeStatus> OPEN_STATUSES =
            EnumSet.of(REQUESTED, APPROVED, REPLACEMENT_SHIPPED, REPLACEMENT_DELIVERED);

    @Transactional
    public ExchangeResponse request(Long userId, Long orderItemId, ExchangeCreateRequest req) {
        OrderItem item = orderItemRepo.findById(orderItemId)
                .orElseThrow(() -> new IllegalArgumentException("ORDER_ITEM_NOT_FOUND"));

        if (!item.getOrder().getUserId().equals(userId)) {
            throw new SecurityException("NOT_OWNER");
        }

        // 배송완료 여부 + D+7 윈도우 (Shipment.deliveredAt 기준)
        Shipment sh = shipmentRepo.findByOrderId(item.getOrder().getId())
                .orElseThrow(() -> new IllegalStateException("SHIPMENT_NOT_FOUND"));
        if (sh.getDeliveredAt() == null) throw new IllegalStateException("NOT_DELIVERED");

        LocalDateTime windowEnds = sh.getDeliveredAt().plusDays(7);
        if (LocalDateTime.now().isAfter(windowEnds)) throw new IllegalStateException("WINDOW_CLOSED");

        // 열린 교환 이미 존재?
        if (exchangeRepo.existsByOrderItemIdAndStatusIn(orderItemId, List.copyOf(OPEN_STATUSES))) {
            throw new IllegalStateException("ALREADY_OPEN_EXCHANGE");
        }

        // 수량 검증
        int orderedQty = item.getQty();
        int qty = Math.max(1, req.qty());
        if (qty > orderedQty) throw new IllegalArgumentException("QTY_EXCEEDS_ORDERED");

        // 상품/원본 변형 복원
        Product product = productRepo.findById(item.getProductId())
                .orElseThrow(() -> new IllegalArgumentException("PRODUCT_NOT_FOUND"));
        ProductVariant originalVariant = resolveOriginalVariant(product, item.getOptionSnapshotJson());

        // 요청 변형 검증 (같은 상품 소속만)
        ProductVariant requested = null;
        if (req.requestedVariantId() != null) {
            requested = variantRepo.findById(req.requestedVariantId())
                    .orElseThrow(() -> new IllegalArgumentException("REQUESTED_VARIANT_NOT_FOUND"));
            if (!requested.getProduct().getId().equals(product.getId()))
                throw new IllegalArgumentException("VARIANT_NOT_IN_PRODUCT");
        }

        OrderExchange ex = new OrderExchange();
        ex.setUserId(userId);
        ex.setSellerId(item.getSellerId());
        ex.setOrderItem(item);
        ex.setProduct(product);
        ex.setOriginalVariant(originalVariant);
        ex.setRequestedVariant(requested);
        ex.setQty(qty);
        ex.setReasonText(req.reasonText());
        ex.setWindowEndsAt(windowEnds);

        if (req.imageUrls() != null) {
            for (String url : req.imageUrls()) {
                OrderExchangePhoto p = new OrderExchangePhoto();
                p.setExchange(ex);
                p.setImageUrl(url);
                ex.getPhotos().add(p);
            }
        }

        exchangeRepo.save(ex);
        return toDto(ex);
    }

    @Transactional
    public ExchangeResponse approve(Long sellerId, Long exchangeId, ExchangeDecisionRequest req) {
        OrderExchange ex = exchangeRepo.findByIdAndSellerId(exchangeId, sellerId)
                .orElseThrow(() -> new SecurityException("EXCHANGE_NOT_FOUND_OR_NOT_SELLER"));
        if (ex.getStatus() != REQUESTED) throw new IllegalStateException("INVALID_STATUS");

        ProductVariant target = ex.getRequestedVariant() != null ? ex.getRequestedVariant() : ex.getOriginalVariant();
        if (req.approvedVariantId() != null) {
            target = variantRepo.findById(req.approvedVariantId())
                    .orElseThrow(() -> new IllegalArgumentException("APPROVED_VARIANT_NOT_FOUND"));
            if (!target.getProduct().getId().equals(ex.getProduct().getId()))
                throw new IllegalArgumentException("VARIANT_NOT_IN_PRODUCT");
        }

        // 재고 체크 (원단위 재고 값으로만)
        if (target.getStock() < ex.getQty()) throw new IllegalStateException("INSUFFICIENT_STOCK");

        ex.setApprovedVariant(target);
        ex.setStatus(APPROVED);
        return toDto(ex);
    }

    @Transactional
    public ExchangeResponse reject(Long sellerId, Long exchangeId, ExchangeDecisionRequest req) {
        OrderExchange ex = exchangeRepo.findByIdAndSellerId(exchangeId, sellerId)
                .orElseThrow(() -> new SecurityException("EXCHANGE_NOT_FOUND_OR_NOT_SELLER"));
        if (ex.getStatus() != REQUESTED) throw new IllegalStateException("INVALID_STATUS");
        if (req.reason() == null || req.reason().isBlank()) {
            throw new IllegalArgumentException("REJECT_REASON_REQUIRED");
        }
        ex.setRejectReason(req.reason());
        ex.setStatus(ExchangeStatus.REJECTED);
        return toDto(ex);
    }

    @Transactional
    public ExchangeResponse shipReplacement(Long sellerId, Long exchangeId, String carrier, String invoiceNo) {
        OrderExchange ex = exchangeRepo.findByIdAndSellerId(exchangeId, sellerId)
                .orElseThrow(() -> new SecurityException("EXCHANGE_NOT_FOUND_OR_NOT_SELLER"));
        if (ex.getStatus() != APPROVED) throw new IllegalStateException("INVALID_STATUS");

        // 재고 차감 — 프로젝트에 이미 있는 원자 감소 쿼리 사용
        int updated = variantRepo.decreaseStockIfEnough(
                ex.getApprovedVariant().getId(), ex.getQty());
        if (updated == 0) throw new IllegalStateException("INSUFFICIENT_STOCK");

        Long shipmentId = shipmentService.createShipmentForExchange(
                ex.getId(), ex.getUserId(), ex.getProduct().getSellerId(),
                carrier, invoiceNo, ex.getQty(), ShipmentType.EXCHANGE);

        ex.setReplacementShipmentId(shipmentId);
        ex.setStatus(REPLACEMENT_SHIPPED);
        return toDto(ex);
    }

    // 스윗트래커 동기화/웹훅에서 교환 송장 배송완료 감지 시 호출
    @Transactional
    public void markDelivered(Long exchangeId) {
        OrderExchange ex = exchangeRepo.findById(exchangeId)
                .orElseThrow(() -> new IllegalArgumentException("EXCHANGE_NOT_FOUND"));
        if (ex.getStatus() == REPLACEMENT_SHIPPED) {
            ex.setStatus(REPLACEMENT_DELIVERED);
        }
    }

    @Transactional
    public void closeIfDelivered(Long exchangeId) {
        OrderExchange ex = exchangeRepo.findById(exchangeId)
                .orElseThrow(() -> new IllegalArgumentException("EXCHANGE_NOT_FOUND"));
        if (ex.getStatus() == REPLACEMENT_DELIVERED) {
            ex.setStatus(CLOSED);
        }
    }

    // 컨트롤러에서 호출할 수 있도록 public
    public ExchangeResponse toDto(OrderExchange e) {
        return new ExchangeResponse(
                e.getId(),
                e.getOrderItem().getId(),
                e.getProduct().getId(),
                e.getOriginalVariant().getId(),
                e.getRequestedVariant() != null ? e.getRequestedVariant().getId() : null,
                e.getApprovedVariant() != null ? e.getApprovedVariant().getId() : null,
                e.getQty(),
                e.getStatus().name(),
                e.getReasonText(),
                e.getRejectReason(),
                e.getPhotos().stream().map(OrderExchangePhoto::getImageUrl).collect(Collectors.toList()),
                e.getWindowEndsAt().toString(),
                e.getReplacementShipmentId(),
                e.getCreatedAt().toString()
        );
    }

    /**
     * 주문 시점 옵션 스냅샷(JSON)과 Product의 option 라벨을 이용해
     * 원래 구매한 SKU(ProductVariant)를 복원한다.
     */
    private ProductVariant resolveOriginalVariant(Product product, String optionSnapshotJson) {
        Map<String, String> opts;
        try {
            opts = (optionSnapshotJson == null || optionSnapshotJson.isBlank())
                    ? Map.of()
                    : objectMapper.readValue(optionSnapshotJson, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            throw new IllegalStateException("OPTION_SNAPSHOT_PARSE_FAILED", e);
        }

        String o1 = product.getOption1Name() != null ? opts.get(product.getOption1Name()) : null;
        String o2 = product.getOption2Name() != null ? opts.get(product.getOption2Name()) : null;
        String o3 = product.getOption3Name() != null ? opts.get(product.getOption3Name()) : null;
        String o4 = product.getOption4Name() != null ? opts.get(product.getOption4Name()) : null;
        String o5 = product.getOption5Name() != null ? opts.get(product.getOption5Name()) : null;

        return variantRepo.matchOne(product.getId(), o1, o2, o3, o4, o5)
                .orElseThrow(() -> new IllegalStateException("ORIGINAL_VARIANT_NOT_FOUND"));
    }
}
