import React from 'react'
import { Route, Routes } from 'react-router-dom'
import MainPage from '../pages/mainPage/MainPage'

const PublicRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
    </Routes>
  )
}

export default PublicRouter
