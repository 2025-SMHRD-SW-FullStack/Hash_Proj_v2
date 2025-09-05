import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import OrderPage from '../pages/user/orderPage/OrderPage'
import MyPageLayout from '../components/layouts/MyPageLayout'
import MyOrderDetailPage from '../pages/user/myPage/MyOrderDetailPage'
import MyOrders from '../pages/user/myPage/MyOrders'
import FeedbackEditor from '../pages/user/feedbackPage/FeedbackEditor'
import SurveyPage from '../pages/user/SurveyPage'
import PointExchangePage from '../pages/user/myPage/PointExchangePage'
import QnAPage from '../pages/user/support/QnAPage'
import SellerApplyPage from '../pages/user/support/SellerApplyPage'
import ChatPage from '../pages/user/ChatPage'
import ChatRoomPage from '../pages/user/ChatRoomPage'
import OrderCompletePage from '../pages/user/orderPage/OrderCompletePage'
import MyFeedbackHistoryPage from '../pages/user/myPage/myFeedbackPage/MyFeedbackHistoryPage'
import MyFeedbackDetailPage from '../pages/user/myPage/myFeedbackPage/MyFeedbackDetailPage'
import MyCartPage from '../pages/user/myPage/MyCartPage'
import MyInfoPage from '../pages/user/myPage/MyInfoPage'

const UserRouter = () => {
  return (
    <Routes>

      {/* 채팅 페이지 */}
      <Route path="chat" element={<ChatPage />} />
      <Route path="chat/rooms/:roomId" element={<ChatRoomPage />} />

      {/* 상품 주문 페이지 */}
      <Route path='order' element={<OrderPage />} />
      <Route path="pay/complete" element={<OrderCompletePage />} />

      {/* 피드백 관련 페이지 */}
      <Route path="survey" element={<SurveyPage />} />
      <Route path="feedback/editor" element={<FeedbackEditor />} />

      {/* 기본 리다이렉트 */}
      <Route path="/" element={<Navigate to="mypage/orders" replace />} />

      {/* 마이페이지 */}
      <Route path="mypage" element={<MyPageLayout />}>
        <Route index element={<Navigate to="orders" replace />} />
        <Route path="orders" element={<MyOrders />} />
        <Route path="orders/:orderId" element={<MyOrderDetailPage />} />
        <Route path="feedback-history" element={<MyFeedbackHistoryPage />} />
        <Route path="feedback/:feedbackId" element={<MyFeedbackDetailPage />} />
        <Route path="edit" element={<MyInfoPage />} />
        <Route path='cart' element={<MyCartPage/>}/>
        <Route path='point-exchange' element={<PointExchangePage/>}/>
        <Route path="support/qna" element={<QnAPage />} />
        <Route path="seller-apply" element={<SellerApplyPage />} />

        </Route>

    </Routes>
  )
}

export default UserRouter