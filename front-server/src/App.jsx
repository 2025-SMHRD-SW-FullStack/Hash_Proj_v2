import React, { useState, useEffect } from 'react'
import './App.css'
import AppRouter from './routes/AppRouter'
import { BrowserRouter } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}

export default App
