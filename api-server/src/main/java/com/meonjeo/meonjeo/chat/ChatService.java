package com.meonjeo.meonjeo.chat;

import com.meonjeo.meonjeo.chat.dto.ChatDtos.*;
import com.meonjeo.meonjeo.product.ProductSellerJdbcRepository;
import com.meonjeo.meonjeo.user.User;
import com.meonjeo.meonjeo.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ChatService {
    private final ChatRoomRepository roomRepo;
    private final ChatMemberRepository memberRepo;
    private final ChatMessageRepository messageRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate broker;
    private final ProductSellerJdbcRepository productSellerRepo;

    private static String roomKeyForUserSeller(Long userId, Long sellerId) {
        return "U" + userId + "-S" + sellerId;
    }

    private Long[] parseIdsFromKey(String key) {
        try {
            if (key == null) return new Long[]{null, null};
            String[] parts = key.split("-");
            Long buyerId = Long.valueOf(parts[0].substring(1)); // after 'U'
            Long sellerId = Long.valueOf(parts[1].substring(1)); // after 'S'
            return new Long[]{buyerId, sellerId};
        } catch (Exception e) {
            return new Long[]{null, null};
        }
    }

    private boolean isSellerSide(ChatRoom r, Long uid) {
        Long[] ids = parseIdsFromKey(r.getRoomKey());
        return Objects.equals(ids[1], uid);
    }

    private boolean isBuyerSide(ChatRoom r, Long uid) {
        Long[] ids = parseIdsFromKey(r.getRoomKey());
        return Objects.equals(ids[0], uid);
    }

    @Transactional
    public ChatRoom createOrGetUserSellerRoom(Long userId, Long sellerId) {
        String key = roomKeyForUserSeller(userId, sellerId);
        return roomRepo.findByRoomKey(key).orElseGet(() -> {
            ChatRoom room = roomRepo.save(ChatRoom.builder()
                    .roomUid(UUID.randomUUID().toString())
                    .type(ChatRoomType.USER_SELLER)
                    .roomKey(key)
                    .build());
            memberRepo.save(ChatMember.builder().roomId(room.getId()).userId(userId).build());
            memberRepo.save(ChatMember.builder().roomId(room.getId()).userId(sellerId).build());
            return room;
        });
    }

    // 기존 listRooms를 역할 파라미터 포함으로 확장
    @Transactional(readOnly = true)
    public List<RoomResponse> listRooms(Long userId, String as) {
        List<ChatRoom> rooms = roomRepo.findRoomsForUser(userId);
        boolean sellerMode = "seller".equalsIgnoreCase(as);

        // 역할 기준 필터링
        rooms = rooms.stream()
                .filter(r -> sellerMode ? isSellerSide(r, userId) : isBuyerSide(r, userId))
                .toList();

        List<RoomResponse> out = new ArrayList<>();
        for (ChatRoom r : rooms) {
            out.add(toRoomSummary(r, userId));
        }
        return out;
    }

    private RoomResponse toRoomSummary(ChatRoom r, Long userId) {
        List<ChatMember> members = memberRepo.findByRoomId(r.getId());
        Long otherId = members.stream().map(ChatMember::getUserId).filter(id -> !id.equals(userId)).findFirst().orElse(null);
        User other = otherId == null ? null : userRepo.findById(otherId).orElse(null);

        List<ChatMessage> latest = messageRepo.findPage(r.getId(), null, PageRequest.of(0, 1));
        String preview = latest.isEmpty() ? null : latest.get(0).getContent();
        LocalDateTime lastTime = latest.isEmpty() ? null : latest.get(0).getCreatedAt();

        Long lastRead = memberRepo.findByRoomIdAndUserId(r.getId(), userId).map(ChatMember::getLastReadMessageId).orElse(null);
        long unread = messageRepo.countUnread(r.getId(), lastRead, userId);

        return RoomResponse.builder()
                .roomId(r.getId()).roomUid(r.getRoomUid()).type(r.getType())
                .other(other == null ? null : new ParticipantView(other.getId(), other.getNickname(), other.getProfileImageUrl()))
                .lastMessagePreview(preview).lastMessageTime(lastTime)
                .unreadCount(unread)
                .build();
    }

    @Transactional(readOnly = true)
    public List<MessageView> getMessages(Long roomId, Long beforeId, int size) {
        List<ChatMessage> page = messageRepo.findPage(roomId, beforeId, PageRequest.of(0, size));
        List<MessageView> views = new ArrayList<>();
        for (int i = page.size() - 1; i >= 0; i--) {
            ChatMessage m = page.get(i);
            views.add(toView(m));
        }
        return views;
    }

    private static MessageView toView(ChatMessage m) {
        return MessageView.builder()
                .id(m.getId()).roomId(m.getRoomId()).senderId(m.getSenderId())
                .type(m.getType()).content(m.getContent()).clientMsgId(m.getClientMsgId())
                .createdAt(m.getCreatedAt()).build();
    }

    @Transactional
    public MessageView sendMessage(Long roomId, Long senderId, ChatMessageType type, String content, String clientMsgId) {
        if (clientMsgId != null) {
            Optional<ChatMessage> dup = messageRepo.findByRoomIdAndClientMsgId(roomId, clientMsgId);
            if (dup.isPresent()) return toView(dup.get());
        }
        ChatMessageType effectiveType = (type == null ? ChatMessageType.TEXT : type);

        ChatMessage saved = messageRepo.saveAndFlush(ChatMessage.builder()
                .roomId(roomId).senderId(senderId)
                .type(effectiveType).content(content).clientMsgId(clientMsgId)
                .build());

        ChatRoom r = roomRepo.findById(roomId).orElseThrow();
        r.setUpdatedAt(LocalDateTime.now());
        roomRepo.save(r);

        MessageView view = toView(saved);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                broker.convertAndSend("/sub/chat/rooms/" + roomId, view);
                notifyRoomEvent(roomId, "ROOM_UPDATED");
            }
        });
        return view;
    }

    @Transactional
    public void markRead(Long roomId, Long userId, Long lastReadMessageId) {
        ChatMember m = memberRepo.findByRoomIdAndUserId(roomId, userId).orElseThrow();
        if (m.getLastReadMessageId() == null || (lastReadMessageId != null && lastReadMessageId > m.getLastReadMessageId())) {
            m.setLastReadMessageId(lastReadMessageId);
            memberRepo.save(m);
        }
        Map<String, Object> payload = Map.of(
                "type", "READ",
                "roomId", roomId,
                "userId", userId,
                "lastReadMessageId", lastReadMessageId
        );
        broker.convertAndSend("/sub/chat/rooms/" + roomId, payload);
    }

    @Transactional
    public ChatRoom createOrGetRoomByProduct(Long userId, Long productId) {
        Long sellerId = productSellerRepo.findSellerIdByProductId(productId)
                .orElseThrow(() -> new IllegalArgumentException("상품에 연결된 셀러를 찾을 수 없습니다."));
        return createOrGetUserSellerRoom(userId, sellerId);
    }

    // ─ helpers ─
    private void notifyRoomEvent(Long roomId, String type) {
        List<ChatMember> members = memberRepo.findByRoomId(roomId);
        Map<String, Object> payload = Map.of("type", type, "roomId", roomId);
        for (ChatMember m : members) {
            String uid = String.valueOf(m.getUserId());
            broker.convertAndSendToUser(uid, "/queue/chat/room-events", payload);
            broker.convertAndSend("/sub/chat/users/" + uid + "/room-events", payload);
        }
    }
}
