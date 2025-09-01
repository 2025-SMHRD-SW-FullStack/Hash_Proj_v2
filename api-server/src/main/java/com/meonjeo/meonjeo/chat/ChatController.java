package com.meonjeo.meonjeo.chat;

import com.meonjeo.meonjeo.auth.JwtTokenProvider;
import com.meonjeo.meonjeo.chat.dto.ChatDtos.*;
import com.meonjeo.meonjeo.security.AuthSupport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chat;
    private final AuthSupport auth;                   // HTTP용
    private final JwtTokenProvider jwtTokenProvider;  // STOMP 폴백 인증용

    private Long uid() { return auth.currentUserId(); }

    @PostMapping("/rooms/user-seller")
    public RoomResponse openUserSellerRoom(@RequestBody CreateRoomRequest req) {
        var room = chat.createOrGetUserSellerRoom(uid(), req.getSellerId());
        // 유저 모드 기준으로 응답(목록 DTO 재사용)
        return chat.listRooms(uid(), "user").stream()
                .filter(r -> r.getRoomId().equals(room.getId()))
                .findFirst().orElseThrow();
    }

    @GetMapping("/rooms")
    public List<RoomResponse> rooms(@RequestParam(name = "as", defaultValue = "user") String as) {
        return chat.listRooms(uid(), as);
    }

    @GetMapping("/rooms/{roomId}/messages")
    public List<MessageView> listMessages(@PathVariable Long roomId,
                                          @RequestParam(required = false) Long before,
                                          @RequestParam(defaultValue = "50") int size) {
        return chat.getMessages(roomId, before, Math.min(size, 100));
    }

    @PostMapping("/rooms/{roomId}/read")
    public void markRead(@PathVariable Long roomId, @RequestBody ReadUpToRequest req) {
        chat.markRead(roomId, uid(), req.getLastReadMessageId());
    }

    // ── STOMP ────────────────────────────────────────────────────────

    @MessageMapping("/chat/send/{roomId}")
    public void send(@DestinationVariable Long roomId,
                     @Header(name = "Authorization", required = false) String authHeader1,
                     @Header(name = "authorization", required = false) String authHeader2,
                     SendMessageRequest req,
                     Principal principal) {

        Long userId = resolveUserId(principal, firstNonNull(authHeader1, authHeader2));
        chat.sendMessage(roomId, userId, req.getType(), req.getContent(), req.getClientMsgId());
    }

    @MessageMapping("/chat/read/{roomId}")
    public void read(@DestinationVariable Long roomId,
                     @Header(name = "Authorization", required = false) String authHeader1,
                     @Header(name = "authorization", required = false) String authHeader2,
                     ReadUpToRequest req,
                     Principal principal) {

        Long userId = resolveUserId(principal, firstNonNull(authHeader1, authHeader2));
        chat.markRead(roomId, userId, req.getLastReadMessageId());
    }

    private static String firstNonNull(String a, String b) { return a != null ? a : b; }

    /** STOMP 인증 폴백: 1) Principal, 2) Authorization 헤더(Bearer) */
    private Long resolveUserId(Principal principal, String authHeader) {
        if (principal != null && principal.getName() != null) {
            try { return Long.valueOf(principal.getName()); }
            catch (NumberFormatException ignore) { /* 아래 토큰으로 폴백 */ }
        }
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring("Bearer ".length());
            if (jwtTokenProvider.validateToken(token)) {
                return jwtTokenProvider.getUserId(token);
            }
        }
        throw new IllegalStateException("Unauthenticated STOMP message");
    }

    @PostMapping("/rooms/by-product/{productId}")
    public RoomResponse openByProduct(@PathVariable Long productId) {
        var room = chat.createOrGetRoomByProduct(uid(), productId);
        return chat.listRooms(uid(), "user").stream()
                .filter(r -> r.getRoomId().equals(room.getId()))
                .findFirst().orElseThrow();
    }
}
