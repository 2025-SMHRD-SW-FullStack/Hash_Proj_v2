import React, { useState, useMemo, useEffect, useRef } from 'react'
import styles from './MainPage.module.css'
import MainMissions from '../../components/mainPage/MainMissions'
import Button from '../../components/Button'
import arrowLeft from '../../assets/icons/ic_arrow_left.svg'
import arrowRight from '../../assets/icons/ic_arrow_right.svg'
import Icon from '../../components/Icon'
import MainLayout from '../../components/layouts/MainLayout' // 1. MainLayout을 사용해야 합니다.
import useWindowWidth from '../../hooks/useWindowWidth'

const MainPage = () => {
  const testNumber = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const [currentIndex, setCurrentIndex] = useState(0)
  const width = useWindowWidth()
  const intervalRef = useRef(null)

  const isMobile = width < 640

  // 👇 화면 크기에 따라 보여줄 아이템 개수
  const itemsPerPage = isMobile ? 1 : 3

  useEffect(() => {
    // 5초마다 currentIndex를 1씩 증가시키는 인터벌 설정
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testNumber.length)
    }, 5000)

    // 컴포넌트가 언마운트될 때 인터벌 정리
    return () => clearInterval(intervalRef.current)
  }, [testNumber.length])

  const handlePrev = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + testNumber.length) % testNumber.length
    )
  }

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testNumber.length)
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
                className="flex transition-transform duration-500"
                style={{
                  width: `${(100 / itemsPerPage) * testNumber.length}%`,
                  transform: `translateX(-${(currentIndex * 100) / testNumber.length}%)`,
                }}
              >
                {testNumber.map((v) => (
                  <div key={v} className="w-full px-2">
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
            <Button className="w-[100%] bg-[#60BCD8]">로그인하기</Button>
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
