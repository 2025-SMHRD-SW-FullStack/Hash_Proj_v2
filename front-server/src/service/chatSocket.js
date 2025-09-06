// front-server/src/service/chatSocket.js
import SockJS from 'sockjs-client/dist/sockjs'
import { Client } from '@stomp/stompjs'
import useAuthStore from '../stores/authStore'

// ───── URL 구성 (기존 로직 유지) ─────
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (window.__API_BASE__) ||
  ''

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

// 🔁 재연결 backoff
const BACKOFF_MIN = 2000
const BACKOFF_MAX = 30000
let backoff = BACKOFF_MIN

// 📤 오프라인 아웃박스(연결 전/중단 시 전송 예약)
const outbox = [] // { dest, body, headers }

// 🔁 중복수신 방지(최근 메시지 키 캐시)
// key: `${roomId}:${id||clientMsgId}` → ts
const recentKeys = new Map()
const RECENT_MAX = 1000
const RECENT_TTL_MS = 5 * 60 * 1000
function rememberKey(key) {
  recentKeys.set(key, Date.now())
  if (recentKeys.size > RECENT_MAX) {
    // 가장 오래된 것부터 정리
    const entries = [...recentKeys.entries()].sort((a, b) => a[1] - b[1])
    const toDelete = entries.slice(0, entries.length - RECENT_MAX)
    for (const [k] of toDelete) recentKeys.delete(k)
  }
}
function isRecentKey(key) {
  const ts = recentKeys.get(key)
  if (!ts) return false
  if (Date.now() - ts > RECENT_TTL_MS) {
    recentKeys.delete(key)
    return false
  }
  return true
}

// ───── 내부 유틸 ─────
function safeParse(s) {
  try { return JSON.parse(s) } catch { return { type: 'TEXT', content: s } }
}

function deliverRoomEvent(rid, msg) {
  const keyBase = msg?.id ?? msg?.clientMsgId
  if (keyBase) {
    const key = `${rid}:${keyBase}`
    if (isRecentKey(key)) return // 🔒 중복 차단
    rememberKey(key)
  }
  const rec = roomSubs.get(rid)
  if (!rec) return
  for (const h of rec.handlers) {
    try { h(msg) } catch {}
  }
}

function flushOutbox() {
  if (!connected) return
  while (outbox.length) {
    const { dest, body, headers } = outbox.shift()
    try {
      client.publish({ destination: dest, body, headers })
    } catch {
      // 퍼블리시 실패면 다음 연결에서 다시 시도
      outbox.unshift({ dest, body, headers })
      break
    }
  }
}

function ensureClient() {
  if (client) return client

  client = new Client({
    webSocketFactory: () => new SockJS(SOCKET_URL),
    reconnectDelay: backoff,          // 동적으로 조정
    heartbeatIncoming: 25000,         // 서버 → 클라 하트비트 수신
    heartbeatOutgoing: 25000,         // 클라 → 서버 하트비트 송신
    // 재(연)결 직전에 최신 토큰 반영
    beforeConnect: () => {
      const token = useAuthStore.getState()?.accessToken
      client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      // 최신 backoff 적용
      client.reconnectDelay = backoff
    },
    debug: () => {}, // 필요시 console.log
  })

  client.onConnect = () => {
    connected = true
    connecting = false
    backoff = BACKOFF_MIN // ✅ 성공 시 backoff 리셋

    // 끊겼다가 붙었을 때 모든 구독 재개
    for (const [rid, rec] of roomSubs.entries()) {
      if (!rec.stompSub) {
        rec.stompSub = client.subscribe(`/sub/chat/rooms/${rid}`, (msg) => {
          const body = safeParse(msg.body)
          deliverRoomEvent(rid, body)
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

    flushOutbox() // 📤 대기 전송
    while (waiters.length) waiters.shift()?.()
  }

  client.onWebSocketClose = () => {
    connected = false
    connecting = false
    // 다음 재시도 backoff 증가(상한 제한)
    backoff = Math.min(BACKOFF_MAX, Math.round(backoff * 1.7))
    if (client) client.reconnectDelay = backoff

    // STOMP Subscription 핸들만 비워둠(재연결 시 다시 붙임)
    for (const rec of roomSubs.values()) rec.stompSub = null
    userEvents.stompSub = null
  }

  client.onStompError = () => {
    // 에러 시에도 다음 시도 때 backoff 상승
    backoff = Math.min(BACKOFF_MAX, Math.round(backoff * 1.7))
    if (client) client.reconnectDelay = backoff
  }

  // 🔄 탭 가시성 복귀 시 연결 없으면 즉시 재시도
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !connected && !connecting) {
        try { client.activate() } catch {}
      }
    })
  }

  return client
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
    try { client.activate() } catch { connecting = false }
  })
}

// 방 토픽 구독: 동일 roomId는 STOMP 구독 1개만 두고 핸들러만 팬아웃
export function subscribeRoom(roomId, handler) {
  const ridNum = Number(roomId)
  if (!Number.isFinite(ridNum) || ridNum <= 0) return () => {}
  const rid = String(ridNum)

  let rec = roomSubs.get(rid)
  if (!rec) {
    rec = { stompSub: null, handlers: new Set() }
    roomSubs.set(rid, rec)
  }
  rec.handlers.add(handler)

  if (connected && !rec.stompSub) {
    rec.stompSub = client.subscribe(`/sub/chat/rooms/${rid}`, (msg) => {
      const body = safeParse(msg.body)
      deliverRoomEvent(rid, body)
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
  const uidNum = Number(userId)
  if (!Number.isFinite(uidNum) || uidNum <= 0) return () => {}
  const uid = String(uidNum)

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

// 내부 퍼블리시: 연결 없으면 큐잉
function publishOrQueue(dest, payloadObj) {
  const token = useAuthStore.getState()?.accessToken
  const headers = token ? { Authorization: `Bearer ${token}` } : {}
  const body = JSON.stringify(payloadObj)

  if (!connected) {
    outbox.push({ dest, body, headers })
    return
  }
  try {
    client.publish({ destination: dest, body, headers })
  } catch {
    outbox.push({ dest, body, headers })
  }
}

// 메시지 전송/읽음: 항상 최신 토큰으로 헤더 세팅
export function sendMessage(roomId, payload) {
  const rid = Number(roomId)
  if (!Number.isFinite(rid) || rid <= 0) return
  publishOrQueue(`/pub/chat/send/${rid}`, payload)
}

export function sendRead(roomId, lastReadMessageId) {
  const rid = Number(roomId)
  if (!Number.isFinite(rid) || rid <= 0) return
  publishOrQueue(`/pub/chat/read/${rid}`, { lastReadMessageId })
}

// 🔕 컴포넌트 언마운트 시 실수로 연결을 죽이지 않도록 no-op 유지
export function disconnect() {
  // 의도적으로 아무것도 하지 않음
}

// 선택: 상태 확인용
export function isConnected() { return connected }

export default { connect, disconnect, subscribeRoom, subscribeUserRoomEvents, sendMessage, sendRead, isConnected }
