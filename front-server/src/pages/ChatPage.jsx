import React from 'react'
import useAuthStore from '../stores/authStore'

const ChatPage = () => {
  const { isLoggedIn, accessToken } = useAuthStore()

  return (
    <div className="border border-solid p-4">
      <h2 className="mb-4 w-full max-w-7xl text-xl font-bold">채팅 목록</h2>
      <div className="space-y-2">
        <p>
          <strong>로그인 상태:</strong>{' '}
          {isLoggedIn ? '로그인됨' : '로그인 안됨'}
        </p>
        <p>
          <strong>토큰:</strong> {accessToken || '토큰 없음'}
        </p>
        <p>채팅 기능이 여기에 구현됩니다.</p>
      </div>
    </div>
  )
}

export default ChatPage
