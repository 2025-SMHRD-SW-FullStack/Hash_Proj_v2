import React, { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState(null) // 사용자 역할 추가
  const [token, setToken] = useState(null) // 토큰 추가

  const login = (role = 'USER', userToken = 'test-token-123') => {
    // 기본값은 USER, 임시 토큰
    setIsLoggedIn(true)
    setUserRole(role)
    setToken(userToken)
  }

  const logout = () => {
    setIsLoggedIn(false)
    setUserRole(null)
    setToken(null)
  }

  return (
    // Provider에 상태와 함수 전달 => useAuth()로 접근 가능
    <AuthContext.Provider
      value={{ isLoggedIn, userRole, token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// 다른 컴포넌트에서 Context 값을 쉽게 가져오기 위한 커스텀 훅
// const {isLoggedIn, userRole, login, logout} = useAuth() 이런 식으로 사용 가능
export const useAuth = () => useContext(AuthContext)
