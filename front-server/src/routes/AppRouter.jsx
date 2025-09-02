// /src/routes/AppRouter.jsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import PublicRouter from './PublicRouter'
import UserRouter from './UserRouter'
import AdminRouter from './AdminRouter'
import MainPage from '../pages/MainPage'
import LoginPage from '../pages/authPage/LoginPage'
import PhoneVerifiedHandler from '../pages/authPage/PhoneVerifiedHandler'
import OAuthSuccess from '../pages/authPage/OAuthSuccess'
import EmailSignUp from '../pages/authPage/EmailSignUpPage'
import useAuthStore from '../stores/authStore'
import MainLayout from '../components/layouts/MainLayout'
import ProductPage from '../pages/ProductPage'
import ProductDetailPage from '../pages/ProductDetailPage'
import SellerRouter from './SellerRouter'
import FindAuthPage from '../pages/authPage/FindAuthPage'
import FAQPage from '../pages/user/support/FAQPage'
import QnAPage from '../pages/user/support/QnAPage'


const AppRouter = () => {
  const { isLoggedIn } = useAuthStore() // 스토어에서 isLoggedIn 상태 가져오기

  return (
    <Routes>
      {/* 공용 메인 레이아웃 영역 */}
      <Route element={<MainLayout />}>
        {/* 메인/상품 */}
        <Route path="/" element={<MainPage />} />
        <Route path='/products' element={<ProductPage />} />
        {/* ✅ :productId를 사용해 동적 경로로 변경 */}
        <Route path="/product/:productId" element={<ProductDetailPage />} />

        {/* 로그인 / 회원가입 관련 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/email_signup" element={<EmailSignUp />} />

        {/* 휴대폰 인증 관련 */}
        <Route path="/phone-verified" element={<PhoneVerifiedHandler />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        {/* 👇 아이디/비밀번호 찾기 페이지 라우트 추가 */}
        <Route path="/find-auth" element={<FindAuthPage />} />

        {/* 고객센터 하위 메뉴 */}
        <Route path="support/faq" element={<FAQPage />} />
        <Route path="support/qna" element={<QnAPage />} />

        {/* 비회원 전용 페이지들 */}
        {!isLoggedIn && <Route path="/public/*" element={<PublicRouter />} />}

        {/* 로그인한 사용자 전용 페이지들 */}
        {/* TODO: 유저 구분 */}
        {isLoggedIn && <Route path="/user/*" element={<UserRouter />} />}

        {/* 비회원 전용 */}
        {!isLoggedIn && <Route path="/public/*" element={<PublicRouter />} />}

        {/* 로그인 사용자 전용 */}
        {isLoggedIn && <Route path="/user/*" element={<UserRouter />} />}
      </Route>

      {/* 셀러(중간관리자) */}
      <Route path="/seller/*" element={<SellerRouter />} />

      {/* 관리자(로그인 필요) */}
      {isLoggedIn && <Route path="/admin/*" element={<AdminRouter />} />}
    </Routes>
  )
}

export default AppRouter
