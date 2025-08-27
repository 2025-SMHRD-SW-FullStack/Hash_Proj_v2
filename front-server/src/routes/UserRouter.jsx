import React from 'react'
import { Route, Routes } from 'react-router-dom'
import ChatPage from '../pages/ChatPage'
import MyPage from '../pages/mypage/MyPage'
import UserInfo from '../components/mypage/UserInfo'
import ComInfo from '../components/mypage/ComInfo'
import OrderPage from '../pages/OrderPage'

const UserRouter = () => {
  return (
    <Routes>
      {/* 채팅 페이지 - 로그인한 사용자/사장님만 접근 가능 */}
      <Route path="/chat" element={<ChatPage />} />
      {/* 상품 주문 페이지 */}
      <Route path='/order' element={<OrderPage />} />
      {/* <Route path='/order?variantId=VARIANT_ID&quantity=QUANTITY' element={<OrderPage/>}/> */}

      {/* 마이페이지 관련 */}
      <Route path="/mypage" element={<MyPage />}>
        <Route index element={<UserInfo />} />
        <Route path="user_info" element={<UserInfo />} />
        <Route path="com_info" element={<ComInfo />} />
      </Route>
    </Routes>
  )
}

export default UserRouter
