import { useParams, useNavigate } from 'react-router-dom'
import ChatRoom from '../../../components/chat/ChatRoom'

export default function SellerChatRoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const rid = Number(roomId)
  const valid = Number.isFinite(rid) && rid > 0

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <ChatRoom roomId={valid ? rid : undefined} onClose={() => navigate(-1)} />
    </div>
  )
}
