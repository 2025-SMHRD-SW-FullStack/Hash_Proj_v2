import { useState, useEffect } from 'react'

const useWindowWidth = () => {
  // 1. 현재 화면 너비를 저장할 state를 만듭니다.
  const [width, setWidth] = useState(window.innerWidth)

  useEffect(() => {
    // 2. 화면 크기가 변경될 때마다 state를 업데이트하는 함수입니다.
    const handleResize = () => setWidth(window.innerWidth)

    // 3. resize 이벤트가 발생할 때마다 handleResize 함수를 호출합니다.
    window.addEventListener('resize', handleResize)

    // 4. 컴포넌트가 사라질 때 이벤트 리스너를 정리(clean-up)합니다.
    return () => window.removeEventListener('resize', handleResize)
  }, []) // 빈 배열을 전달하여 컴포넌트가 처음 마운트될 때만 실행되도록 합니다.

  return width // 현재 화면 너비를 반환합니다.
}

export default useWindowWidth
