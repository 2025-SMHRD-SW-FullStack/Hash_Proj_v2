package com.meonjeo.meonjeo.chat;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ChatMemberRepository extends JpaRepository<ChatMember, Long> {
    Optional<ChatMember> findByRoomIdAndUserId(Long roomId, Long userId);
    List<ChatMember> findByRoomId(Long roomId);
    List<ChatMember> findByUserId(Long userId);
}
