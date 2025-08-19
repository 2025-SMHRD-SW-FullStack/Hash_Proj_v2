import React from 'react'
import { Route, Routes } from 'react-router-dom'
import MainPage from '../pages/mainPage/MainPage'
import ChatPage from '../pages/ChatPage'

const PublicRouter = () => {
  return (
    <Routes>
        <Route path='/' element={<MainPage/>}/>
    </Routes>
  )
}

export default PublicRouter