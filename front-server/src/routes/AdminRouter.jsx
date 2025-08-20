import React from 'react'

const AdminRouter = () => {
  const isLoggedIn = !!localStorage.getItem('accessToken')

  return (
    <div>
      AdminRouter - 로그인 상태: {isLoggedIn ? '로그인됨' : '로그인 안됨'}
    </div>
  )
}

export default AdminRouter
