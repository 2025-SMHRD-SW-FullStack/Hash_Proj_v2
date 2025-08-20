import React from 'react'
import MainLayout from '../components/layouts/MainLayout'
import { useAuth } from '../components/context/AuthContext'

const ChatPage = () => {
  const { token, userRole } = useAuth()

  return (
    <MainLayout>
      <div className="border border-solid p-4">
        <h2 className="mb-4 w-full max-w-7xl text-xl font-bold">채팅 목록</h2>
        <div className="space-y-2">
          <p>
            <strong>토큰:</strong> {token}
          </p>
          <p>
            <strong>사용자 역할:</strong> {userRole}
          </p>
          <p>채팅 기능이 여기에 구현됩니다.</p>
        </div>
      </div>
    </MainLayout>
  )
}

export default ChatPage
