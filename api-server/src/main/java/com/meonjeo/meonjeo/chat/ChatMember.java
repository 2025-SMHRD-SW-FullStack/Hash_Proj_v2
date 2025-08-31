package com.meonjeo.meonjeo.chat;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name="chat_members", uniqueConstraints = {
        @UniqueConstraint(name="uk_room_user", columnNames = {"room_id","user_id"})
}, indexes = {
        @Index(name="idx_member_user", columnList = "user_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMember {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="room_id", nullable=false)
    private Long roomId;

    @Column(name="user_id", nullable=false)
    private Long userId;

    @Column(name="last_read_message_id")
    private Long lastReadMessageId;

    @CreationTimestamp @Column(name="joined_at", updatable=false)
    private LocalDateTime joinedAt;
    @UpdateTimestamp @Column(name="updated_at")
    private LocalDateTime updatedAt;
}
