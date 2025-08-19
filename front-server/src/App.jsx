import React from 'react'
import './App.css'
import AppRouter from './routes/AppRouter'
import { AuthProvider, useAuth } from './components/context/AuthContext'
import { BrowserRouter } from 'react-router-dom'

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
          <AppRouter />
      </AuthProvider>
    </BrowserRouter> 
  )
}

export default App