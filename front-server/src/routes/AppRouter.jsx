import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from '../components/context/AuthContext'
import PublicRouter from './PublicRouter'
import UserRouter from './UserRouter'
import AdminRouter from './AdminRouter'
import MainPage from '../pages/MainPage/MainPage'
import LoginPage from '../pages/authPage/LoginPage'
import PhoneVerifiedHandler from '../pages/authPage/PhoneVerifiedHandler'
import OAuthSuccess from '../pages/authPage/OAuthSuccess'
import SignUpPage from '../pages/authPage/SignUpPage'
import EmailSignUp from '../pages/authPage/EmailSignUpPage'

const AppRouter = () => {
  const { isLoggedIn, userRole } = useAuth()

  return (
    <Routes>
      {/* 공통 페이지 - 모든 사용자가 접근 가능 */}
      <Route path="/" element={<MainPage />} />

      {/* 로그인 / 회원가입 관련 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/email_signup" element={<EmailSignUp />} />

      {/* 휴대폰 인증 관련 */}
      <Route path="/phone-verified" element={<PhoneVerifiedHandler />} />
      <Route path="/oauth-success" element={<OAuthSuccess />} />

      {/* 비회원 전용 페이지들 */}
      {!isLoggedIn && <Route path="/public/*" element={<PublicRouter />} />}

      {/* 로그인한 사용자 전용 페이지들 */}
      {isLoggedIn && (userRole === 'USER' || userRole === 'OWNER') && (
        <Route path="/user/*" element={<UserRouter />} />
      )}

      {/* 관리자 전용 페이지들 */}
      {isLoggedIn && userRole === 'ADMIN' && (
        <Route path="/admin/*" element={<AdminRouter />} />
      )}
    </Routes>
  )
}

export default AppRouter
