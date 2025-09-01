package com.meonjeo.meonjeo.chat;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.*;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    @Query("select m from ChatMessage m where m.roomId=:roomId and (:beforeId is null or m.id<:beforeId) order by m.id desc")
    List<ChatMessage> findPage(Long roomId, Long beforeId, Pageable pageable);

    @Query("select count(m) from ChatMessage m where m.roomId=:roomId and m.id > coalesce(:lastReadId,0) and m.senderId<>:viewerId")
    long countUnread(Long roomId, Long lastReadId, Long viewerId);

    Optional<ChatMessage> findByRoomIdAndClientMsgId(Long roomId, String clientMsgId);
}
