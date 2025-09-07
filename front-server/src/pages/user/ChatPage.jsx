import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatList from '../../components/chat/ChatList'
import useAppModeStore from '../../stores/appModeStore'

const ChatPage = () => {
  const navigate = useNavigate()
  const { setMode } = useAppModeStore()

  useEffect(() => { setMode('user') }, [setMode])

  const open = (roomId) => {
    const rid = Number(roomId)
    if (Number.isFinite(rid) && rid > 0) {
      navigate(`/user/chat/rooms/${rid}`)
    }
  }

  return (
    <div className="relative mx-auto h-full w-full max-w-2xl overflow-hidden pt-8">
      <strong className="mb-4 block text-2xl font-bold">채팅 목록</strong>
      <div className="space-y-2 rounded-lg border p-4">
        <ChatList onOpenRoom={open} />
      </div>
    </div>
  )
}

export default ChatPage
