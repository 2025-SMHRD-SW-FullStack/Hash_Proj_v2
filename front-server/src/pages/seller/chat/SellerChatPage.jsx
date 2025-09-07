import React, { useState, Suspense, useEffect } from 'react'
import ChatList from '../../../components/chat/ChatList'
const ChatRoom = React.lazy(() => import('../../../components/chat/ChatRoom'))
import useAppModeStore from '../../../stores/appModeStore'

export default function SellerChatPage() {
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const { setMode } = useAppModeStore()

  // ✅ 셀러 모드 고정
  useEffect(() => { setMode('seller') }, [setMode])

  const open = (roomId) => {
    const rid = Number(roomId)
    if (Number.isFinite(rid) && rid > 0) setSelectedRoomId(rid)
  }
  const close = () => setSelectedRoomId(null)

  return (
    <div className="relative flex h-full w-full justify-center overflow-hidden">
      {selectedRoomId && (
        <div className="fixed inset-0 z-10 bg-black/50 transition-opacity duration-300" onClick={close} />
      )}

      <div className="flex h-full w-full max-w-xl flex-col px-4 pt-8">
        <strong className="mb-4 block text-2xl font-bold shrink-0">채팅 목록</strong>
        <div className="space-y-2 rounded-lg border p-4 shadow-sm flex-1 overflow-y-auto">
          {/* ✅ 콜백명 onOpenRoom */}
          <ChatList onOpenRoom={open} />
        </div>
      </div>

      <div className={`fixed top-0 right-0 z-40 h-full w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 ease-in-out ${
        selectedRoomId ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedRoomId && (
          <Suspense fallback={<div className="p-4">채팅방 불러오는 중…</div>}>
            <ChatRoom role="seller" roomId={selectedRoomId} onClose={close} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
