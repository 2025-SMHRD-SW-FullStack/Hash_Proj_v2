import { useLocation, useNavigate } from 'react-router-dom'

const useGoHome = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const snapTop = () => {
    const root =
      document.querySelector('[data-scroll-root]') ||
      document.getElementById('scroll-root') ||
      document.scrollingElement ||
      document.documentElement

    try { root.scrollTo({ top: 0, left: 0, behavior: 'auto' }) }
    catch { root.scrollTop = 0 }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  return () => {
    if (location.pathname === '/') {
      // ✅ 이미 홈이면 내비게이션 없이 즉시 상단으로
      snapTop()
      // 한 프레임 뒤 한 번 더 (안전망)
      requestAnimationFrame(() => setTimeout(snapTop, 0))
    } else {
      // ✅ 홈으로 이동하면서 ScrollToTop에 'top' 신호 전달
      navigate('/', { state: { scroll: 'top', forceTop: true, ts: Date.now() } })
      // 이동 직후 프레임에서 한 번 더 보정 (레이아웃 마운트 타이밍 대비)
      requestAnimationFrame(() => setTimeout(snapTop, 0))
    }
  }
}

export default useGoHome
