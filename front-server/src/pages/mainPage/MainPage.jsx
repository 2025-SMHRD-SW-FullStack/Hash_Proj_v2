import React, { useState, useMemo, useEffect, useRef } from 'react'
import styles from './MainPage.module.css'
import MainMissions from '../../components/mainPage/MainMissions'
import Button from '../../components/Button'
import arrowLeft from '../../assets/icons/ic_arrow_left.svg'
import arrowRight from '../../assets/icons/ic_arrow_right.svg'
import Icon from '../../components/Icon'
import MainLayout from '../../components/layouts/MainLayout' // 1. MainLayout을 사용해야 합니다.
import useWindowWidth from '../../hooks/useWindowWidth'
import { useNavigate } from 'react-router-dom'

const MainPage = () => {
  const testNumber = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const [currentIndex, setCurrentIndex] = useState(0)
  const [enableTransition, setEnableTransition] = useState(true)
  const width = useWindowWidth()
  const intervalRef = useRef(null)
  const navigate = useNavigate()

  const isMobile = width < 640

  // 👇 화면 크기에 따라 보여줄 아이템 개수
  const itemsPerPage = isMobile ? 1 : 3

  // 무한 루프 구현을 위해 앞뒤에 아이템을 복제
  const extendedItems = useMemo(() => {
    const headClones = testNumber.slice(0, itemsPerPage)
    const tailClones = testNumber.slice(-itemsPerPage)
    return [...tailClones, ...testNumber, ...headClones]
  }, [testNumber, itemsPerPage])

  useEffect(() => {
    // 5초마다 1칸씩 이동
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => prevIndex + 1)
    }, 5000)

    return () => clearInterval(intervalRef.current)
  }, [extendedItems.length])

  // 레이아웃 변경 시 첫 실제 아이템 위치로 이동
  useEffect(() => {
    setEnableTransition(false)
    setCurrentIndex(itemsPerPage)
    // 다음 프레임에 트랜지션 복구
    const id = requestAnimationFrame(() => setEnableTransition(true))
    return () => cancelAnimationFrame(id)
  }, [itemsPerPage])

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => prevIndex - 1)
  }

  const handleNext = () => {
    setCurrentIndex((prevIndex) => prevIndex + 1)
  }

  const handleTransitionEnd = () => {
    // 오른쪽 끝(앞에 복제된 구간)에 도달 → 첫 실제 아이템으로 점프
    if (currentIndex >= itemsPerPage + testNumber.length) {
      setEnableTransition(false)
      setCurrentIndex(itemsPerPage)
      requestAnimationFrame(() => setEnableTransition(true))
      return
    }
    // 왼쪽 끝(뒤에 복제된 구간)에 도달 → 마지막 실제 아이템으로 점프
    if (currentIndex < itemsPerPage) {
      setEnableTransition(false)
      setCurrentIndex(itemsPerPage + testNumber.length - 1)
      requestAnimationFrame(() => setEnableTransition(true))
    }
  }

  return (
    <MainLayout>
      <div className="flex w-full gap-6">
        <section className="min-w-0 flex-1">
          <div className="mb-12 flex items-center">
            {/* 👇 모바일이 아닐 때만 화살표를 보여줍니다. */}
            {!isMobile && (
              <Icon
                src={arrowLeft}
                alt="왼쪽 이동"
                className="cursor-pointer"
                onClick={handlePrev}
              />
            )}
            {/* 👇 배너를 감싸는 뷰포트, 넘치는 부분을 숨깁니다. */}
            <div className="w-full flex-1 overflow-hidden">
              {/* 👇 실제로 움직이는 컨테이너, translateX로 슬라이드 효과 */}
              <div
                className={`flex ${enableTransition ? 'transition-transform duration-500' : ''}`}
                style={{
                  width: `${(100 / itemsPerPage) * extendedItems.length}%`,
                  transform: `translateX(-${(currentIndex * 100) / extendedItems.length}%)`,
                }}
                onTransitionEnd={handleTransitionEnd}
              >
                {extendedItems.map((v, idx) => (
                  <div
                    key={`${v}-${idx}`}
                    className="px-2"
                    style={{ width: `${100 / extendedItems.length}%` }}
                  >
                    <div className={styles.bannerItem}>배너 {v}</div>
                  </div>
                ))}
              </div>
            </div>
            {!isMobile && (
              <Icon
                src={arrowRight}
                alt="오른쪽 이동"
                className="cursor-pointer"
                onClick={handleNext}
              />
            )}
          </div>

          <div className="space-y-10">
            <MainMissions label="✨ 신규 미션" />
            <MainMissions label="💖 지금 인기 있는 미션" />
            <MainMissions label="⏰ 마감 임박 미션" />
          </div>
        </section>

        <aside className="top-8 w-1/5 flex-shrink-0">
          <div className="mb-12 flex h-[250px] flex-col items-center justify-center rounded-lg border border-solid border-black px-4 text-center">
            <p>로그인 문구</p>
            <Button
              size="lg"
              className="w-[100%]"
              onClick={() => navigate('/login')}
            >
              로그인하기
            </Button>
          </div>
          {testNumber.slice(0, 3).map((v, i) => (
            <div key={i} className="mt-4 h-28 w-[100%] rounded-lg bg-gray-300">
              고정구좌 {v}
            </div>
          ))}
        </aside>
      </div>
    </MainLayout>
  )
}

export default MainPage
