import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listRooms } from '../../service/chatService'
import chatSocket from '../../service/chatSocket'
import useAuthStore from '../../stores/authStore'
import useAppModeStore from '../../stores/appModeStore'
import dayjs from 'dayjs'

export default function ChatList({ onOpenRoom, onChatSelect }) {
  const me = useAuthStore(s => s.user)
  const { mode } = useAppModeStore() // 'user' | 'seller'
  const [rooms, setRooms] = useState([])
  const subsRef = useRef([])          // 방별 언서브 함수들
  const unsubEventRef = useRef(null)  // 유저 이벤트 언서브
  const navigate = useNavigate()

  const base = mode === 'seller' ? '/seller' : '/user'
  const asParam = mode === 'seller' ? 'seller' : 'user'
  const cb = onOpenRoom || onChatSelect

  // 최신 메시지 우선 정렬
  const sortRooms = (arr) =>
    [...arr].sort((a, b) => {
      const at = a?.lastMessageTime ? Date.parse(a.lastMessageTime) : 0
      const bt = b?.lastMessageTime ? Date.parse(b.lastMessageTime) : 0
      if (bt !== at) return bt - at
      const au = a?.unreadCount ?? 0
      const bu = b?.unreadCount ?? 0
      if (bu !== au) return bu - au
      return (b?.roomId ?? 0) - (a?.roomId ?? 0)
    })

  const roomIds = useMemo(() => rooms.map(r => r.roomId), [rooms])

  // ─ 최초/모드 변경: 소켓 연결 + 유저 이벤트 구독 + 목록 초기화
  useEffect(() => {
    let mounted = true

    chatSocket.connect(async () => {
      if (!mounted) return
      const rs = await listRooms(asParam)
      if (mounted) setRooms(sortRooms(rs))

      // 유저별 ROOM_UPDATED 등 단일 경로 구독
      if (unsubEventRef.current) try { unsubEventRef.current() } catch {}
      unsubEventRef.current = chatSocket.subscribeUserRoomEvents(me?.id, (evt) => {
        if (evt?.type === 'ROOM_UPDATED') {
          listRooms(asParam).then(r => setRooms(sortRooms(r)))
        }
      })
    })

    return () => {
      mounted = false
      try { unsubEventRef.current?.() } catch {}
      unsubEventRef.current = null
      // ⛔ 여기서 chatSocket.disconnect() 호출 금지(전역 연결을 죽임)
    }
  }, [me?.id, asParam])

  // ─ roomIds 변경 시: 방 토픽 재구독만
  useEffect(() => {
    chatSocket.connect(() => {
      // 이전 방 구독 해제
      subsRef.current.forEach(u => { try { u?.() } catch {} })
      subsRef.current = []

      // 새 방들 구독
      roomIds.forEach(rid => {
        const unsub = chatSocket.subscribeRoom(rid, (evt) => {
          setRooms(prev => {
            const next = prev.map(r => ({ ...r }))
            const idx = next.findIndex(r => r.roomId === rid)
            if (idx < 0) return prev

            if (evt?.type === 'READ') {
              if (evt.userId === me?.id) next[idx].unreadCount = 0
              return sortRooms(next)
            }

            // 메시지 수신 → 미리보기/시간/미읽음 갱신
            next[idx].lastMessagePreview = evt.content || ''
            next[idx].lastMessageTime = evt.createdAt || new Date().toISOString()
            if (me?.id && evt.senderId !== me.id) {
              next[idx].unreadCount = (next[idx].unreadCount || 0) + 1
            }
            return sortRooms(next)
          })
        })
        subsRef.current.push(unsub)
      })
    })

    // 방 목록 바뀔 때마다 이전 구독만 깔끔히 해제
    return () => {
      subsRef.current.forEach(u => { try { u?.() } catch {} })
      subsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomIds.join('-'), me?.id])

  const open = (rid) => {
    if (cb) cb(rid)
    else navigate(`${base}/chat/rooms/${rid}`)
  }

  return (
    <div className="space-y-2">
      {rooms.map(r => (
        <button
          key={r.roomId}
          type="button"
          className="w-full rounded-xl border p-3 text-left hover:bg-gray-50"
          onClick={() => open(r.roomId)}
        >
          <div className="flex items-center justify-between">
            <div className="font-semibold">{r.other?.nickname || '상대'}</div>
            <div className="text-xs text-gray-400">
              {r.lastMessageTime ? dayjs(r.lastMessageTime).format('HH:mm') : ''}
            </div>
          </div>
          <div className="mt-1 line-clamp-1 text-sm text-gray-600">
            {r.lastMessagePreview || '대화를 시작해보세요'}
          </div>
          {!!r.unreadCount && (
            <div className="mt-2 inline-block rounded-full bg-black px-2 py-0.5 text-xs text-white">
              {r.unreadCount}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
