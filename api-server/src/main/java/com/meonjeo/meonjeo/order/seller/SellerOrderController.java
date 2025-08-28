package com.meonjeo.meonjeo.order.seller;

import com.meonjeo.meonjeo.common.OrderStatus;
import com.meonjeo.meonjeo.order.seller.dto.RegisterShipmentRequest;
import com.meonjeo.meonjeo.order.seller.dto.SellerOrderGridRow;
import com.meonjeo.meonjeo.security.AuthSupport;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Tag(name = "셀러 주문")
@RestController
@RequestMapping("/api/seller/orders")
@RequiredArgsConstructor
public class SellerOrderController {

    private final SellerOrderService service;
    private final AuthSupport auth;

    // (기존 목록/상세는 유지)

    @Operation(
            summary = "셀러 주문관리 그리드",
            description = """
        표 컬럼에 맞춘 그리드 전용 API입니다.
        - 상태는 배송 타임라인의 '원문 상태'를 우선 사용(이벤트 없으면 주문상태 매핑)
        - 택배사/송장번호는 셀러가 등록한 최신 1건 노출
        - 피드백 마감은 배송완료(deliveredAt) 기준 D+7까지 D-값 표기
        """
    )
    @GetMapping("/grid")
    public Page<SellerOrderGridRow> grid(
            @Parameter(description = "주문 상태", schema = @Schema(implementation = OrderStatus.class))
            @RequestParam(required = false) OrderStatus status,
            @Parameter(description = "조회 시작일(포함). 예: 2025-08-01")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @Parameter(description = "조회 종료일(포함). 예: 2025-08-28")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @Parameter(description = "검색어(주문번호/수취인/연락처)")
            @RequestParam(required = false) String q,
            @ParameterObject @PageableDefault(size = 20) Pageable pageable
    ) {
        Long sellerId = auth.currentUserId();
        return service.listGridForSeller(sellerId, status, from, to, q, pageable);
    }

    @Operation(
            summary = "셀러 송장 등록",
            description = """
        셀러가 택배 발송 후 택배사/송장번호를 등록합니다.
        - 동일 주문에서 셀러가 여러 송장 등록 가능(부분출고 등)
        - 등록 즉시 배송상태는 '배송준비중'으로 표기되고, 추적 이벤트 동기화 시 타임라인으로 대체됩니다.
        """
    )
    @PostMapping("/{orderId}/shipments")
    public Long registerShipment(@PathVariable Long orderId, @RequestBody RegisterShipmentRequest req) {
        Long sellerId = auth.currentUserId();
        return service.registerShipment(sellerId, orderId, req);
    }

    @Operation(
            summary = "셀러 주문관리 CSV 다운로드",
            description = """
    현재 필터(상태/기간/검색)에 맞는 **전체 결과(모든 페이지)**를 CSV로 스트리밍 다운로드합니다.
    - 컬럼: 주문번호, 주문일, 상태, 택배사, 송장번호, 피드백 마감, 상품명, 받는이, 주소, 연락처, 배송요청사항
    - 인코딩: UTF-8 with BOM (엑셀 한글 깨짐 방지)
    """
    )
    @GetMapping(value = "/grid/export", produces = "text/csv")
    public ResponseEntity<StreamingResponseBody> exportCsv(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String q
    ) {
        Long sellerId = auth.currentUserId();

        String filename = "seller-orders-" +
                DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss").format(java.time.LocalDateTime.now()) + ".csv";
        String headerValue = "attachment; filename=\"" + URLEncoder.encode(filename, StandardCharsets.UTF_8) + "\"";

        StreamingResponseBody body = out -> {
            // UTF-8 BOM (엑셀 호환)
            out.write(new byte[] {(byte)0xEF, (byte)0xBB, (byte)0xBF});

            var writer = new java.io.OutputStreamWriter(out, StandardCharsets.UTF_8);
            var pw = new java.io.PrintWriter(writer, false);

            // 헤더
            pw.println(String.join(",",
                    "주문번호","주문일","상태","택배사","송장번호","피드백 마감",
                    "상품명","받는이","주소","연락처","배송요청사항"));

            // 페이지 단위로 전량 스트리밍
            int page = 0, size = 1000;
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

            while (true) {
                var pageable = org.springframework.data.domain.PageRequest.of(page, size,
                        org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id"));

                var pageData = service.listGridForSeller(sellerId, status, from, to, q, pageable);

                for (var row : pageData.getContent()) {
                    String[] cols = new String[] {
                            row.orderUid(),
                            row.orderDate() == null ? "" : dtf.format(row.orderDate()),
                            nz(row.statusText()),
                            nz(row.courierName()),
                            nz(row.trackingNo()),
                            nz(row.feedbackDue()),
                            nz(row.productName()),
                            nz(row.receiver()),
                            nz(row.address()),
                            nz(row.phone()),
                            nz(row.requestMemo())
                    };
                    pw.println(toCsvLine(cols));
                }
                pw.flush(); // 스트리밍 즉시 전송

                if (pageData.isLast()) break;
                page++;
            }
            pw.flush();
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, headerValue)
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(body);
    }

    // 작은 유틸들
    private static String nz(String s) { return (s == null) ? "" : s; }
    private static String toCsvLine(String[] cols) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cols.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(quote(cols[i]));
        }
        return sb.toString();
    }
    private static String quote(String v) {
        // CSV 안전: " -> "" 치환, 줄바꿈/콤마/따옴표 있으면 전체를 ""
        if (v == null) return "";
        boolean need = v.contains(",") || v.contains("\"") || v.contains("\n") || v.contains("\r");
        String w = v.replace("\"", "\"\"");
        return need ? "\"" + w + "\"" : w;
    }
}
