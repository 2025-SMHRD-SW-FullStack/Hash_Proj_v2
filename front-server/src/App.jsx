import React, { useState, useEffect } from 'react'
import './App.css'
import AppRouter from './routes/AppRouter'
import { BrowserRouter } from 'react-router-dom'
import ScrollToTop from './components/common/ScrollToTop'

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop behavior="auto" />
      <AppRouter />
    </BrowserRouter>
  )
}

export default App
