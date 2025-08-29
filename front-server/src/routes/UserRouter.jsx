import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ChatPage from '../pages/user/ChatPage'
import OrderPage from '../pages/user/OrderPage'
import MyPageLayout from '../components/layouts/MyPageLayout'
import MyOrderDetailPage from '../pages/user/myPage/MyOrderDetailPage'
import MyOrders from '../pages/user/myPage/MyOrders'
import FeedbackEditor from '../pages/feedbackPage/FeedbackEditor'
import MyInfoPage from '../pages/user/myPage/MyInfoPage'
import FAQPage from '../pages/user/myPage/support/FAQPage'
import QnAPage from '../pages/user/myPage/support/QnAPage'
import SellerApplyPage from '../pages/user/myPage/support/SellerApplyPage'
import SurveyPage from '../pages/user/SurveyPage'
import MyCartpage from '../pages/user/myPage/MyCartPage'

const UserRouter = () => {
  return (
    <Routes>
      {/* [수정] 
        상위 라우터(AppRouter)의 '/user/*' 경로에 연결되므로, 
        하위 경로에서는 맨 앞의 '/'를 제거하여 상대 경로로 만들어야 합니다.
        (예: "/chat" -> "chat")
      */}

      {/* 채팅 페이지 */}
      <Route path="chat" element={<ChatPage />} />

      {/* 상품 주문 페이지 */}
      <Route path='order' element={<OrderPage />} />

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
        <Route path="edit" element={<MyInfoPage />} />
        <Route path='cart' element={<MyCartpage/>}/>

        {/* 고객센터 하위 메뉴 */}
        <Route path="support/faq" element={<FAQPage />} />
        <Route path="support/qna" element={<QnAPage />} />
        <Route path="seller-apply" element={<SellerApplyPage />} />
      </Route>

    </Routes>
  )
}

export default UserRouter