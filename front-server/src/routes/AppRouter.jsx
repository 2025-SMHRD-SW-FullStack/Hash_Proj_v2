import React from 'react'
import { Routes, Route } from 'react-router-dom'

import PublicRouter from './PublicRouter'
import UserRouter from './UserRouter'
import AdminRouter from './AdminRouter'
import SellerRouter from './SellerRouter'

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
        <Route path="/product" element={<ProductPage />} />
        <Route path="/product/:productId" element={<ProductDetailPage />} />

        {/* 인증 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/email_signup" element={<EmailSignUp />} />
        <Route path="/phone-verified" element={<PhoneVerifiedHandler />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />

        {/* 결제 결과 */}
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
