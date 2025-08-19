import React from 'react'
import { Route, Routes } from 'react-router-dom'

const UserRouter = () => {
  return (
    <Routes>
        <Route path='/chat' element={<ChatPage/>}/>
        
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