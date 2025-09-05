// src/stores/chatStore.js
import { create } from 'zustand'

/**
 * roomMeta 구조:
 * {
 *   [roomId]: {
 *     otherLastReadId: number|null, // 상대가 읽은 마지막 서버메시지 ID
 *     myLastReadId: number|null,    // 내가 읽은 마지막 서버메시지 ID
 *     unread: number                // 서버 기준 미읽음 (목록 API의 unreadCount 반영/초기화)
 *   }
 * }
 */
const useChatStore = create((set, get) => ({
  // 목록/메시지
  rooms: [],
  messages: {}, // { [roomId]: Message[] }
  roomMeta: {},

  // 내 정보(보낸/읽은 메시지 구분용)
  me: null,
  setMe: (me) => set({ me }),

  // --- Rooms ---
  setRooms: (rooms) => {
    // rooms 업데이트하면서 meta도 안전하게 병합
    const meta = { ...get().roomMeta }
    ;(rooms || []).forEach((r) => {
      const rid = String(r.roomId ?? r.id)
      const prev = meta[rid] || {}
      meta[rid] = {
        ...prev,
        otherLastReadId:
          r.otherLastReadMessageId != null
            ? r.otherLastReadMessageId
            : prev.otherLastReadId ?? null,
        unread:
          r.unreadCount != null
            ? Number(r.unreadCount)
            : Number(prev.unread ?? 0),
      }
    })
    set({ rooms, roomMeta: meta })
  },

  /** 단일 방 upsert (소켓 ROOM_UPDATED로 재조회 후 반영할 때 사용) */
  upsertRoom: (room) => {
    const rid = String(room.roomId ?? room.id)
    const cur = get().rooms
    const idx = cur.findIndex((r) => String(r.roomId ?? r.id) === rid)
    const nextRooms =
      idx >= 0
        ? [...cur.slice(0, idx), { ...cur[idx], ...room }, ...cur.slice(idx + 1)]
        : [room, ...cur]
    const meta = { ...get().roomMeta }
    const prev = meta[rid] || {}
    meta[rid] = {
      ...prev,
      otherLastReadId:
        room.otherLastReadMessageId != null
          ? room.otherLastReadMessageId
          : prev.otherLastReadId ?? null,
      unread:
        room.unreadCount != null ? Number(room.unreadCount) : Number(prev.unread ?? 0),
    }
    set({ rooms: nextRooms, roomMeta: meta })
  },

  // --- Messages ---
  appendMessage: (roomId, msg) => {
    const rid = String(roomId)
    const me = get().me
    const list = get().messages[rid] || []

    // 멱등: id 또는 clientMsgId 기준 중복 차단
    const key = msg?.id ?? msg?.clientMsgId
    if (key && list.some((m) => (m.id ?? m.clientMsgId) === key)) return

    const enriched = { ...msg, isMine: me?.id && msg.senderId === me.id }
    set({ messages: { ...get().messages, [rid]: [...list, enriched] } })
  },

  prependMessages: (roomId, older = []) => {
    const rid = String(roomId)
    const me = get().me
    const list = get().messages[rid] || []
    const existingKeys = new Set(list.map((m) => String(m.id ?? m.clientMsgId)))
    const enriched = older
      .filter((m) => !existingKeys.has(String(m.id ?? m.clientMsgId)))
      .map((m) => ({ ...m, isMine: me?.id && m.senderId === me.id }))
    set({ messages: { ...get().messages, [rid]: [...enriched, ...list] } })
  },

  // --- Read / Unread ---
  /** 소켓 READ 이벤트 또는 내가 markRead 했을 때 호출 */
  applyReadEvent: (roomId, userId, lastReadMessageId) => {
    const me = get().me
    const rid = String(roomId)
    const meta = { ...get().roomMeta }
    const cur = meta[rid] || {}

    if (me && userId === me.id) {
      // 내가 읽음 처리
      meta[rid] = {
        ...cur,
        myLastReadId: lastReadMessageId ?? null,
        unread: 0, // 내 화면에서는 미읽음 제거
      }
    } else {
      // 상대가 읽음 처리 → 말풍선 "1" 계산용
      meta[rid] = {
        ...cur,
        otherLastReadId: lastReadMessageId ?? null,
      }
    }
    set({ roomMeta: meta })
  },

  setUnread: (roomId, count) => {
    const rid = String(roomId)
    const meta = { ...get().roomMeta }
    const cur = meta[rid] || {}
    meta[rid] = { ...cur, unread: Number(count || 0) }
    set({ roomMeta: meta })
  },

  // 전체 초기화(로그아웃 등)
  clear: () => set({ rooms: [], messages: {}, roomMeta: {}, me: null }),
}))

export default useChatStore
