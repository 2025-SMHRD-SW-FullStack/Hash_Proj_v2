import React, { useState, useMemo, useEffect, useRef } from 'react'
import MainProducts from '../components/mainPage/MainProducts'
import Button from '../components/common/Button'
import arrowLeft from '../assets/icons/ic_arrow_left.svg'
import arrowRight from '../assets/icons/ic_arrow_right.svg'
import Icon from '../components/common/Icon'
import useWindowWidth from '../hooks/useWindowWidth'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import { getMyPointBalance } from '../service/pointService' // Import the point service

const MainPage = () => {
  const testNumber = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const [currentIndex, setCurrentIndex] = useState(0)
  const [enableTransition, setEnableTransition] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const width = useWindowWidth()
  const intervalRef = useRef(null)
  const navigate = useNavigate()
  const { isLoggedIn, user, logout } = useAuthStore()
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false); // Changed initial state to false
  const [error, setError] = useState(null);

  const isMobile = width < 640
  const itemsPerPage = isMobile ? 1 : 3

  // 톤온톤 컬러 팔레트
  const bannerColors = ['#e0f2ff', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e']
  const fixedColors = ['#bae6fd', '#7dd3fc', '#38bdf8']

  const extendedItems = useMemo(() => {
    const headClones = testNumber.slice(0, itemsPerPage)
    const tailClones = testNumber.slice(-itemsPerPage)
    return [...tailClones, ...testNumber, ...headClones]
  }, [testNumber, itemsPerPage])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!isTransitioning) setCurrentIndex(prev => prev + 1)
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [isTransitioning])

  useEffect(() => {
    setEnableTransition(false)
    setCurrentIndex(itemsPerPage)
    const id = requestAnimationFrame(() => {
      setEnableTransition(true)
      setIsTransitioning(false)
    })
    return () => cancelAnimationFrame(id)
  }, [itemsPerPage])

  // Fetch points when user is logged in
  useEffect(() => {
    const fetchPoints = async () => {
      if (isLoggedIn) {
        try {
          setLoading(true);
          const balance = await getMyPointBalance();
          setPoints(balance);
        } catch (err) {
          setError('포인트 조회 실패');
        } finally {
          setLoading(false);
        }
      }
    };
    fetchPoints();
  }, [isLoggedIn]);


  const handlePrev = () => { if (!isTransitioning) { setIsTransitioning(true); setCurrentIndex(prev => prev - 1) } }
  const handleNext = () => { if (!isTransitioning) { setIsTransitioning(true); setCurrentIndex(prev => prev + 1) } }

  const handleTransitionEnd = () => {
    setIsTransitioning(false)
    if (currentIndex >= itemsPerPage + testNumber.length) {
      setEnableTransition(false)
      setCurrentIndex(itemsPerPage)
      setTimeout(() => setEnableTransition(true), 50)
      return
    }
    if (currentIndex < itemsPerPage) {
      setEnableTransition(false)
      setCurrentIndex(itemsPerPage + testNumber.length - 1)
      setTimeout(() => setEnableTransition(true), 50)
    }
  }

  return (
    <div className="flex w-full gap-6">
      <section className="min-w-0 flex-1">
        {/* 배너 */}
        <div className="mb-6 flex items-center">
          {!isMobile && <Icon src={arrowLeft} alt="왼쪽 이동" className="cursor-pointer" onClick={handlePrev}/>}
          <div className="w-full flex-1 overflow-hidden">
            <div
              className={`flex ${enableTransition ? 'transition-transform duration-700 ease-in-out' : ''}`}
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
                  <div className="h-[250px] w-[445px] rounded-lg flex items-center justify-center text-lg font-semibold"
                       style={{ backgroundColor: bannerColors[v-1] }}
                  >
                    배너 {v}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!isMobile && <Icon src={arrowRight} alt="오른쪽 이동" className="cursor-pointer" onClick={handleNext}/>}
        </div>

        {/* 전체 상품 CTA */}
        <div className="mb-12 text-center">
          <Button size="lg" className="px-8 py-3 bg-black text-white rounded-xl" onClick={() => navigate('/products')}>
            전체 상품 보러가기
          </Button>
        </div>

        {/* 카테고리별 상품 */}
        <div className="space-y-16">
          <MainProducts label="⚙ 전자제품" category="전자제품" />
          <MainProducts label="💄 화장품" category="화장품" />
          <MainProducts label="🍱 밀키트" category="밀키트" />
          <MainProducts label="🖥 플랫폼" category="플랫폼" />
        </div>


        {/* 푸터 */}
        <footer className="mt-20 bg-gray-900 text-white py-6 text-center text-sm rounded-lg">
          ⓒ 2025 Hash 프로젝트. All rights reserved.
        </footer>
      </section>

      {/* 사이드 영역 */}
      <aside className="top-8 hidden w-1/5 flex-shrink-0 sm:block space-y-4">
        <div className="border-[#CCC] border-solid border-[1px]  mb-12 flex h-[250px] flex-col items-center justify-center rounded-lg px-4 text-center">
          {isLoggedIn ? (
            <>
              <p className="mb-4 font-bold">{user?.nickname}님<br /> 오늘도 소중한 피드백 부탁드릴게요!</p>
              <div className='flex items-center'>
                <div className="flex items-center justify-center w-full p-3 rounded-lg text-center">
                  <span className="text-base text-gray-600">내 포인트 &ensp;</span>
                  {loading ? (
                    <p>조회 중...</p>
                  ) : error ? (
                    <p className="text-red-500">{error}</p>
                  ) : (
                    <div className="flextext-xl font-bold ">
                      {points.toLocaleString()}
                      <span className="text-[#35A6CF]">P</span>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full h-10 text-base mb-2"
                  variant="whiteBlack"
                  onClick={() => navigate("/user/mypage/point-exchange")}
                >
                  포인트 교환하기
                </Button>
              </div>
              <Button size="lg" className="w-full" onClick={logout}>로그아웃</Button>
            </>
          ) : (
            <>
              <div className='my-4'>
                <span className='text-[#2A5FF2] font-semibold'>혁신이 시작되는 곳! </span>
                <br />
                 <span>아직 세상에 없는 신제품을 가장 먼저 써보고
                  <br />
                  당신의 솔직한 피드백으로 완성하세요.</span>
              </div>
              <Button size="lg" className="w-full" onClick={() => navigate('/login')}>로그인하기</Button>
            </>
          )}
        </div>
        {testNumber.slice(0, 3).map((v, i) => (
          <div
            key={i}
            className="h-28 w-full rounded-lg flex items-center justify-center font-semibold text-white text-lg"
            style={{ backgroundColor: fixedColors[i] }}
          >
            고정구좌 {v}
          </div>
        ))}
      </aside>
    </div>
  )
}

export default MainPage