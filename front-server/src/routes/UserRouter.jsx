import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ChatPage from '../pages/user/ChatPage'
import OrderPage from '../pages/user/OrderPage'
import MyPageLayout from '../components/layouts/MyPageLayout'
import SurveyPage from '../pages/feedbackPage/SurveyPage'
import FeedbackPage from '../pages/feedbackPage/FeedbackPage'
import MyOrderHistoryPage from '../pages/user/myPage/MyOrderHistoryPage'
import MyOrderDetailPage from '../pages/user/myPage/MyOrderDetailPage'

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
      <Route path="survey/:orderItemId" element={<SurveyPage />} />
      <Route path='feedback' element={<FeedbackPage/>}/>

      {/* --- 마이페이지 관련 (중첩 라우팅 적용) --- */}
      <Route path="mypage" element={<MyPageLayout />}>
        {/* '/user/mypage'로 접속 시 '/user/mypage/orders'로 자동 이동 */}
        <Route index element={<Navigate to="orders" replace />} />
        
        {/* '/user/mypage/orders' 경로 */}
        <Route path="orders" element={<MyOrderHistoryPage />} />
        <Route path="orders/:orderId" element={<MyOrderDetailPage />} />
        
        {/* 다른 마이페이지 메뉴 추가 예시 */}
        {/* <Route path="edit" element={<EditProfilePage />} /> */}
        {/* <Route path="edit" element={<EditProfilePage />} /> */}
      </Route>
      
    </Routes>
  )
}

export default UserRouter