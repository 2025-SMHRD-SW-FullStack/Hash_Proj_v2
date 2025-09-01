package com.meonjeo.meonjeo.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.*;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    Optional<ChatRoom> findByRoomUid(String roomUid);
    Optional<ChatRoom> findByRoomKey(String roomKey);

    @Query("select r from ChatRoom r join ChatMember m on m.roomId=r.id where m.userId=:userId order by r.updatedAt desc")
    List<ChatRoom> findRoomsForUser(Long userId);
}
