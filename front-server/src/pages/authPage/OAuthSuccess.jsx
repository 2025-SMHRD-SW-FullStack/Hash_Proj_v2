import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'
import axiosInstance from '../../config/axiosInstance'

/** [ 인증 성공 시 액세스 토큰 저장 ]
 * - URL에 담긴 액세스 토큰 추출해서 localStorage에 저장한 뒤
 * - 메인 페이지로 리다이렉트
 */
const OAuthSuccess = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  useEffect(() => {
    const handleOAuthLogin = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')

      if (token) {
        try {
          // 서버에서 사용자 정보를 가져오기 전에 login 액션을 먼저 호출하여 토큰을 설정합니다.
          // 이렇게 하면 axiosInstance의 request 인터셉터가 헤더에 토큰을 넣어줍니다.

          const userResponse = await axiosInstance.get('/api/users/me', {
            headers: { Authorization: `Bearer ${token}` }, // 명시적으로 헤더를 추가해줍니다.
          })

          // 스토어의 login 액션을 호출하여 상태를 완벽하게 업데이트
          login({
            accessToken: token,
            user: userResponse.data,
          })

          // 메인 페이지로 이동
          navigate('/', { replace: true })
        } catch (error) {
          console.error('소셜 로그인 처리 실패:', error)
          alert('로그인 처리에 실패했습니다. 다시 시도해주세요.')
          navigate('/login')
        }
      } else {
        alert('토큰이 존재하지 않습니다.')
        navigate('/login')
      }
    }

    handleOAuthLogin()
  }, [navigate, login])

  return (
    <div>
      <p>로그인 처리 중입니다...</p>
    </div>
  )
}

export default OAuthSuccess
