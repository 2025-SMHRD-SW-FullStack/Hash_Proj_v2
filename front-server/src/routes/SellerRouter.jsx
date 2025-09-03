// /src/routes/SellerRouter.jsx
import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import SellerLayout from '/src/components/layouts/SellerLayout'
import SellerMain from '/src/pages/seller/SellerMain'
import OrdersPage from '../pages/seller/OrdersPage'
import PayoutsPage from '../pages/seller/PayoutsPage'
import AdsPowerPage from '../pages/seller/AdsPowerPage'
import AdsPayCompletePage from '../pages/seller/AdsPayCompletePage'
import AdsManagementPage from '../pages/seller/AdsManagementPage'
import FeedbacksManagePage from '../pages/seller/Feedbacks/FeedbacksManagePage'
import FeedbacksStatsPage from '../pages/seller/Feedbacks/FeedbacksStatsPage'
import ExchangeManagementPage from '../pages/seller/ExchangeManagementPage'
import ProductsPage from '../pages/seller/product/ProductsPage'
import ProductNewPage from '../pages/seller/product/ProductNewPage'
import ProductDetailPage from '../pages/seller/product/ProductDetailPage'
import ProductEditPage from '../pages/seller/product/ProductEditPage'
import ScrollToTop from '/src/components/common/ScrollToTop'
import SellerChatPage from '../pages/seller/chat/SellerChatPage'
import SellerChatRoomPage from '../pages/seller/chat/SellerChatRoomPage'

/** 중간관리자(셀러) 메인 라우터 */
const SellerRouter = () => {
  return (
    <SellerLayout>
      <ScrollToTop />
      <Routes>
        {/* 셀러 메인 */}
        <Route index element={<SellerMain />} />

        {/* 채팅 */}
        <Route path="chat" element={<SellerChatPage />} />
        <Route path="chat/rooms/:roomId" element={<SellerChatRoomPage />} />

        {/* 피드백 관리 */}
        <Route path="feedbacks">
          <Route index element={<Navigate to="manage" replace />} />
          <Route path="manage" element={<FeedbacksManagePage />} />
          <Route path="stats" element={<FeedbacksStatsPage />} />
        </Route>

        {/* 상품 관리 */}
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductNewPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="products/:id/edit" element={<ProductEditPage />} />

        {/* 주문/정산/광고/교환 */}
        <Route path="orders" element={<OrdersPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
        <Route path="exchanges/pending" element={<ExchangeManagementPage />} />
        <Route path="ads">
          <Route path="power" element={<AdsPowerPage />} />
          <Route path="management" element={<AdsManagementPage />} />
          <Route path="pay/complete" element={<AdsPayCompletePage />} />
        </Route>
      </Routes>
    </SellerLayout>
  )
}

export default SellerRouter
