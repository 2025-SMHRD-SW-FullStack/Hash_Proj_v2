package com.meonjeo.meonjeo.chat.dto;

import com.meonjeo.meonjeo.chat.*;
import lombok.*;
import java.time.LocalDateTime;

public class ChatDtos {
    @Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
    public static class RoomResponse {
        private Long roomId; private String roomUid; private ChatRoomType type;
        private ParticipantView other;
        private String lastMessagePreview; private LocalDateTime lastMessageTime;
        private long unreadCount;
    }

    @Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
    public static class ParticipantView {
        private Long id; private String nickname; private String profileImageUrl;
    }

    @Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
    public static class MessageView {
        private Long id; private Long roomId; private Long senderId; private ChatMessageType type;
        private String content; private String clientMsgId; private LocalDateTime createdAt;
    }

    @Getter @Setter @AllArgsConstructor @NoArgsConstructor
    public static class CreateRoomRequest { private Long sellerId; }

    @Getter @Setter @AllArgsConstructor @NoArgsConstructor
    public static class SendMessageRequest {
        private String content; private ChatMessageType type = ChatMessageType.TEXT; private String clientMsgId;
    }

    @Getter @Setter @AllArgsConstructor @NoArgsConstructor
    public static class ReadUpToRequest { private Long lastReadMessageId; }
}
