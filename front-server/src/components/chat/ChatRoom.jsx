import { useEffect, useRef, useState } from 'react'
import { listMessages, markRead } from '../../service/chatService'
import chatSocket from '../../service/chatSocket'
import useAuthStore from '../../stores/authStore'

export default function ChatRoom({ roomId, onClose }) {
  const me = useAuthStore(s => s.user)
  const [msgs, setMsgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [oldestId, setOldestId] = useState(null)
  const [input, setInput] = useState('')
  const [otherLastReadId, setOtherLastReadId] = useState(null) // 상대가 읽은 마지막 메시지 ID
  const bottomRef = useRef(null)

  const rid = Number(roomId)
  const validRoom = Number.isFinite(rid) && rid > 0

  useEffect(() => {
    if (!validRoom) { setLoading(false); return }

    let unsub = () => {}
    chatSocket.connect(() => {
      unsub = chatSocket.subscribeRoom(rid, async (evt) => {
        // 상대가 읽음 → 내 메시지 읽음표시 갱신
        if (evt?.type === 'READ') {
          if (evt.userId !== me?.id) {
            setOtherLastReadId(prev => (prev == null ? evt.lastReadMessageId : Math.max(prev, evt.lastReadMessageId)))
          }
          return
        }

        // 일반 메시지 수신
        const isMine = me?.id && evt.senderId === me.id
        setMsgs(prev => [...prev, { ...evt, isMine }])
        scrollToBottom('instant')

        // 상대가 보낸 메시지면 즉시 읽음 처리(카톡 UX)
        if (!isMine && evt?.id) {
          await markRead(rid, evt.id)
        }
      })
    })

    // 초기 메시지
    listMessages(rid, null, 50)
      .then(async data => {
        const decorated = (data || []).map(m => ({ ...m, isMine: me?.id && m.senderId === me.id }))
        setMsgs(decorated)
        setOldestId(decorated?.[0]?.id || null)
        setLoading(false)
        scrollToBottom('auto')
        // 들어온 시점의 마지막 메시지까지 읽음 처리
        const lastId = decorated?.[decorated.length - 1]?.id
        if (lastId) await markRead(rid, lastId)
      })
      .catch(() => setLoading(false))

    return () => { unsub(); chatSocket.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid, me?.id])

  const scrollToBottom = (behavior) => {
    bottomRef.current?.scrollIntoView({ behavior: behavior === 'instant' ? 'auto' : (behavior || 'smooth') })
  }

  const loadOlder = async () => {
    if (!oldestId || !validRoom) return
    const older = await listMessages(rid, oldestId, 50)
    if (!older?.length) return
    const decorated = older.map(m => ({ ...m, isMine: me?.id && m.senderId === me.id }))
    setMsgs(prev => [...decorated, ...prev])
    setOldestId(older?.[0]?.id || oldestId)
  }

  const send = () => {
    const text = input.trim()
    if (!text || !validRoom) return

    const clientMsgId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString()
    chatSocket.sendMessage(rid, { type: 'TEXT', content: text, clientMsgId })
    setInput('')
    // 낙관 렌더링 없이 서버 브로드캐스트로만 그린다(중복/순서 안정)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // ─ UI ──────────────────────────────────────────────────────────────────
  if (!validRoom) {
    return (
      <div className="flex h-full flex-col" onClick={e => e.stopPropagation()}>
        <PanelHeader onClose={onClose} />
        <div className="flex-1 p-4 text-red-500">유효하지 않은 채팅방입니다.</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col" onClick={e => e.stopPropagation()}>
        <PanelHeader onClose={onClose} />
        <div className="flex-1 p-4 text-gray-500">불러오는 중…</div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" onClick={e => e.stopPropagation()}>
      <PanelHeader onClose={onClose} />
      <button className="p-2 text-sm text-gray-500 hover:text-black" onClick={loadOlder}>이전 메시지 불러오기</button>

      <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
        {msgs.map(m => (
          <div key={m.id || m.clientMsgId} className={`max-w-[75%] rounded-2xl px-3 py-2 ${m.isMine ? 'ml-auto bg-black text-white' : 'bg-white border'}`}>
            <div className="whitespace-pre-wrap break-words">{m.content}</div>

            {/* 카톡식 읽음표시: 내가 보낸 메시지이고, 상대가 아직 안 읽었으면 '1' */}
            {m.isMine && (
              <div className="mt-1 text-right text-[10px] leading-none">
                {(m.id && (otherLastReadId == null || m.id > otherLastReadId)) ? '1' : ''}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t p-3">
        <input
          className="h-11 flex-1 rounded-lg border px-3"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="메시지를 입력하세요"
        />
        <button className="h-11 rounded-lg bg-black px-4 text-white" onClick={send}>보내기</button>
      </div>
    </div>
  )
}

function PanelHeader({ onClose }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
      <div className="text-lg font-semibold">채팅</div>
      {onClose && (
        <button className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50" onClick={onClose}>닫기</button>
      )}
    </div>
  )
}
