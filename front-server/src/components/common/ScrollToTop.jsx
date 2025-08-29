import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // 레이아웃에 스크롤 컨테이너가 있으면 여기서도 잡아줌
    const scroller = document.querySelector('[data-scroll-root]')
    if (scroller) scroller.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    else window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}
