// front-server/src/service/chatSocket.js
import SockJS from 'sockjs-client/dist/sockjs'
import { Client } from '@stomp/stompjs'
import useAuthStore from '../stores/authStore'

// ───── URL 구성 (기존 로직 유지) ─────
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  (window.__API_BASE__) ||
  'http://localhost:7777'

const SOCKET_URL = `${API_BASE.replace(/\/$/, '')}/ws-stomp`

// ───── STOMP 싱글톤 상태 ─────
let client = null
let connected = false
let connecting = false
const waiters = [] // connect 대기 콜백들

// roomId -> { stompSub, handlers:Set<fn> }
const roomSubs = new Map()

// 유저별 룸 이벤트 (단일 토픽만 사용)
const userEvents = { uid: null, stompSub: null, handlers: new Set() }

// ───── 내부 유틸 ─────
function ensureClient() {
  if (client) return client

  client = new Client({
    webSocketFactory: () => new SockJS(SOCKET_URL),
    reconnectDelay: 3000,
    // 재(연)결 직전에 최신 토큰 반영
    beforeConnect: () => {
      const token = useAuthStore.getState()?.accessToken
      client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
    },
    debug: () => {}, // 필요시 console.log
  })

  client.onConnect = () => {
    connected = true
    connecting = false

    // 끊겼다가 붙었을 때 모든 구독 재개
    for (const [rid, rec] of roomSubs.entries()) {
      if (!rec.stompSub) {
        rec.stompSub = client.subscribe(`/sub/chat/rooms/${rid}`, (msg) => {
          const body = safeParse(msg.body)
          for (const h of rec.handlers) {
            try { h(body) } catch {}
          }
        })
      }
    }

    if (userEvents.uid && !userEvents.stompSub) {
      userEvents.stompSub = client.subscribe(
        `/sub/chat/users/${userEvents.uid}/room-events`,
        (msg) => {
          const body = safeParse(msg.body)
          for (const h of userEvents.handlers) {
            try { h(body) } catch {}
          }
        }
      )
    }

    while (waiters.length) waiters.shift()?.()
  }

  client.onWebSocketClose = () => {
    connected = false
    connecting = false
    // STOMP Subscription 핸들만 비워둠(재연결 시 다시 붙임)
    for (const rec of roomSubs.values()) rec.stompSub = null
    userEvents.stompSub = null
  }

  client.onStompError = (frame) => {
    // 필요시 로깅
    // console.error('[STOMP ERROR]', frame)
  }

  return client
}

function safeParse(s) {
  try { return JSON.parse(s) } catch { return { type: 'TEXT', content: s } }
}

// ───── 공개 API ─────
export function connect(onReady) {
  ensureClient()

  if (connected) {
    onReady?.()
    return Promise.resolve()
  }
  if (connecting) {
    return new Promise((res) => waiters.push(() => { onReady?.(); res() }))
  }

  connecting = true
  return new Promise((res) => {
    waiters.push(() => { onReady?.(); res() })
    client.activate()
  })
}

// 방 토픽 구독: 동일 roomId는 STOMP 구독 1개만 두고 핸들러만 팬아웃
export function subscribeRoom(roomId, handler) {
  const rid = String(Number(roomId))
  if (rid === 'NaN' || Number(rid) <= 0) return () => {}

  let rec = roomSubs.get(rid)
  if (!rec) {
    rec = { stompSub: null, handlers: new Set() }
    roomSubs.set(rid, rec)
  }
  rec.handlers.add(handler)

  if (connected && !rec.stompSub) {
    rec.stompSub = client.subscribe(`/sub/chat/rooms/${rid}`, (msg) => {
      const body = safeParse(msg.body)
      for (const h of rec.handlers) {
        try { h(body) } catch {}
      }
    })
  }

  // 언구독: 내 핸들러만 제거, 마지막 핸들러가 빠질 때만 STOMP 언서브
  return () => {
    rec.handlers.delete(handler)
    if (rec.handlers.size === 0 && rec.stompSub) {
      try { rec.stompSub.unsubscribe() } catch {}
      rec.stompSub = null
      roomSubs.delete(rid)
    }
  }
}

// ✅ 유저 이벤트: 단일 토픽만 구독 (/sub/chat/users/{uid}/room-events)
export function subscribeUserRoomEvents(userId, handler) {
  const uid = String(Number(userId))
  if (uid === 'NaN' || Number(uid) <= 0) return () => {}

  // uid가 바뀌면 이전 구독 제거
  if (userEvents.uid && userEvents.uid !== uid && userEvents.stompSub) {
    try { userEvents.stompSub.unsubscribe() } catch {}
    userEvents.stompSub = null
    userEvents.handlers.clear()
  }

  userEvents.uid = uid
  userEvents.handlers.add(handler)

  if (connected && !userEvents.stompSub) {
    userEvents.stompSub = client.subscribe(
      `/sub/chat/users/${uid}/room-events`,
      (msg) => {
        const body = safeParse(msg.body)
        for (const h of userEvents.handlers) {
          try { h(body) } catch {}
        }
      }
    )
  }

  return () => {
    userEvents.handlers.delete(handler)
    if (userEvents.handlers.size === 0 && userEvents.stompSub) {
      try { userEvents.stompSub.unsubscribe() } catch {}
      userEvents.stompSub = null
    }
  }
}

// 메시지 전송/읽음: 항상 최신 토큰으로 헤더 세팅
export function sendMessage(roomId, payload) {
  const rid = Number(roomId)
  if (!connected || !Number.isFinite(rid) || rid <= 0) return

  const token = useAuthStore.getState()?.accessToken
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  client.publish({
    destination: `/pub/chat/send/${rid}`,
    body: JSON.stringify(payload),
    headers,
  })
}

export function sendRead(roomId, lastReadMessageId) {
  const rid = Number(roomId)
  if (!connected || !Number.isFinite(rid) || rid <= 0) return

  const token = useAuthStore.getState()?.accessToken
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  client.publish({
    destination: `/pub/chat/read/${rid}`,
    body: JSON.stringify({ lastReadMessageId }),
    headers,
  })
}

// 🔕 컴포넌트 언마운트 시 실수로 연결을 죽이지 않도록 no-op 처리
export function disconnect() {
  // 의도적으로 아무것도 하지 않음
}

export default { connect, disconnect, subscribeRoom, subscribeUserRoomEvents, sendMessage, sendRead }
