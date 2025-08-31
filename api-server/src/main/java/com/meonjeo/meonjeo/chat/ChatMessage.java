package com.meonjeo.meonjeo.chat;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name="chat_messages", indexes = {
        @Index(name="idx_msg_room_id_id", columnList = "room_id,id"),
        @Index(name="idx_msg_sender", columnList = "sender_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="room_id", nullable=false)
    private Long roomId;

    @Column(name="sender_id", nullable=false)
    private Long senderId;

    @Enumerated(EnumType.STRING)
    @Column(name="type", nullable=false, length=20)
    private ChatMessageType type;

    @Column(name="content", nullable=false, length=4000)
    private String content;

    @Column(name="client_msg_id", length=40)
    private String clientMsgId; // 멱등 키

    @CreationTimestamp @Column(name="created_at", updatable=false)
    private LocalDateTime createdAt;
}
