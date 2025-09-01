import React from 'react'
import SellerLayout from '/src/components/layouts/SellerLayout'
import SellerMain from '/src/pages/seller/SellerMain'
import { Route, Routes, Navigate } from 'react-router-dom'
import OrdersPage from '../pages/seller/OrdersPage'
import PayoutsPage from '../pages/seller/PayoutsPage'
import AdsPowerPage from '../pages/seller/AdsPowerPage'
import FeedbacksManagePage from '../pages/seller/Feedbacks/FeedbacksManagePage'
import FeedbacksStatsPage from '../pages/seller/Feedbacks/FeedbacksStatsPage'
import ProductsPage from '../pages/seller/product/ProductsPage'
import ProductNewPage from '../pages/seller/product/ProductNewPage'
import ProductDetailPage from '../pages/seller/product/ProductDetailPage'
import ProductEditPage from '../pages/seller/product/ProductEditPage'
import SellerChatPage from '../pages/seller/chat/SellerChatPage'
import SellerChatRoomPage from '../pages/seller/chat/SellerChatRoomPage'




/** 중간관리자(셀러) 메인 라우터 – 지금은 한 페이지만 렌더 */
const SellerRouter = () => {
  return (
    <SellerLayout>
      <Routes>

        {/* 셀러페이지 메인 */}
        <Route index element={<SellerMain />} />
        <Route path="chat" element={<SellerChatPage />} />
        <Route path="chat/rooms/:roomId" element={<SellerChatRoomPage />} />

        {/* 피드백 관리 */}
        <Route path="feedbacks">
          <Route index element={<Navigate to="manage" replace />} />
          <Route path="manage" element={<FeedbacksManagePage />} />
          <Route path="stats" element={<FeedbacksStatsPage />} />
        </Route>

        {/* 상품관리 */}

        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductNewPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="products/:id/edit" element={<ProductEditPage />} />

        {/* 주문관리 */}
        <Route path="orders" element={<OrdersPage />} />

        {/* 정산관리 */}
        <Route path="payouts" element={<PayoutsPage />} />

        {/* 파워광고 신청 */}
        <Route path="ads/power" element={<AdsPowerPage />} />

      </Routes>
    </SellerLayout>
  )
}

export default SellerRouter
