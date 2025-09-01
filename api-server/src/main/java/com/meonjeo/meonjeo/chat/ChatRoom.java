package com.meonjeo.meonjeo.chat;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_rooms", uniqueConstraints = {
        @UniqueConstraint(name = "uk_chat_room_key", columnNames = {"room_key"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatRoom {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="room_uid", nullable=false, unique=true, length=36)
    private String roomUid;

    @Enumerated(EnumType.STRING)
    @Column(name="type", nullable=false, length=20)
    private ChatRoomType type;

    @Column(name="room_key", nullable=false, length=100)
    private String roomKey; // e.g. U{buyerId}-S{sellerId}

    @CreationTimestamp @Column(name="created_at", updatable=false)
    private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name="updated_at")
    private LocalDateTime updatedAt;
}
