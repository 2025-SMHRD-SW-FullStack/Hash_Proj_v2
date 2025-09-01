import React from 'react'
import { Routes, Route } from 'react-router-dom'

import PublicRouter from './PublicRouter'
import UserRouter from './UserRouter'
import AdminRouter from './AdminRouter'
import SellerRouter from './SellerRouter'
// import FindAuthPage from '../pages/authPage/FindAuthPage'

import MainLayout from '../components/layouts/MainLayout'
import MainPage from '../pages/MainPage'
import ProductPage from '../pages/ProductPage'
import ProductDetailPage from '../pages/ProductDetailPage'

import LoginPage from '../pages/authPage/LoginPage'
import EmailSignUp from '../pages/authPage/EmailSignUpPage'
import PhoneVerifiedHandler from '../pages/authPage/PhoneVerifiedHandler'
import OAuthSuccess from '../pages/authPage/OAuthSuccess'

import PaySuccess from '../pages/PaySuccess'
import PayFail from '../pages/PayFail'

import useAuthStore from '../stores/authStore'

const AppRouter = () => {
  const { isLoggedIn } = useAuthStore()

  return (
    <Routes>
      {/* 공용 메인 레이아웃 영역 */}
      <Route element={<MainLayout />}>
        {/* 메인/상품 */}
        <Route path="/" element={<MainPage />} />
<<<<<<< HEAD
        <Route path="/product" element={<ProductPage />} />
=======
        <Route path='/products' element={<ProductPage />} />
        {/* ✅ :productId를 사용해 동적 경로로 변경 */}
>>>>>>> 4bcd383b5ec71bb817dea8c62b3994ccc88f5bc9
        <Route path="/product/:productId" element={<ProductDetailPage />} />

        {/* 인증 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/email_signup" element={<EmailSignUp />} />
        <Route path="/phone-verified" element={<PhoneVerifiedHandler />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

<<<<<<< HEAD
        {/* 결제 결과 */}
=======
        {/* 👇 아이디/비밀번호 찾기 페이지 라우트 추가 */}
        {/* <Route path="/find-auth" element={<FindAuthPage />} /> */}

        {/* 비회원 전용 페이지들 */}
        {!isLoggedIn && <Route path="/public/*" element={<PublicRouter />} />}

        {/* 로그인한 사용자 전용 페이지들 */}
        {/* TODO: 유저 구분 */}
        {isLoggedIn && <Route path="/user/*" element={<UserRouter />} />}


        {/* 주문결제 관련 */}
>>>>>>> 4bcd383b5ec71bb817dea8c62b3994ccc88f5bc9
        <Route path="/pay/success" element={<PaySuccess />} />
        <Route path="/pay/fail" element={<PayFail />} />

        {/* 비회원 전용 */}
        {!isLoggedIn && <Route path="/public/*" element={<PublicRouter />} />}

        {/* 로그인 사용자 전용 */}
        {isLoggedIn && <Route path="/user/*" element={<UserRouter />} />}
      </Route>

      {/* 셀러(중간관리자) 전용 라우터 - 별도 레이아웃 */}
      <Route path="/seller/*" element={<SellerRouter />} />

      {/* 관리자 전용 라우터 - 로그인 상태에서만 노출 */}
      {isLoggedIn && <Route path="/admin/*" element={<AdminRouter />} />}
    </Routes>
  )
}

export default AppRouter
