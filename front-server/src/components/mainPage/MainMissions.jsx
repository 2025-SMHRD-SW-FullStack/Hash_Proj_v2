import React, { useState, useMemo } from 'react'
import Icon from '../Icon'
import arrowLeft from '../../assets/icons/ic_arrow_left.svg'
import arrowRight from '../../assets/icons/ic_arrow_right.svg'
import useWindowWidth from '../../hooks/useWindowWidth'
import TestImg from '../../assets/images/ReSsol_TestImg.png'

const MainMissions = ({ label }) => {
  const missions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const width = useWindowWidth() // 1. 훅을 호출하여 현재 너비를 가져옵니다.

  // 👇 웹에서 5개, 모바일(sm)에서 3개, 그보다 작을 때 2개 보이도록 수정
  const itemsPerPage = useMemo(() => {
    if (width > 1024) return 5 // lg 사이즈 이상
    if (width > 640) return 3 // sm 사이즈 이상
    return 2 // 가장 작을 때
  }, [width])

  const [startIndex, setStartIndex] = useState(0)

  const handleNext = () => {
    // 다음 페이지가 전체 아이템 수를 넘지 않도록 조건을 수정합니다.
    if (startIndex + itemsPerPage < missions.length) {
      setStartIndex(startIndex + itemsPerPage)
    }
  }

  const handlePrev = () => {
    if (startIndex - itemsPerPage >= 0) {
      setStartIndex(startIndex - itemsPerPage)
    }
  }

  const isFirstPage = startIndex === 0
  const isLastPage = startIndex + itemsPerPage >= missions.length

  return (
    <div className="w-full">
      <p className="mx-36 text-lg font-bold">{label} 미션</p>
      {/* 👇 이 div가 화살표와 아이템 목록을 모두 포함하도록 수정합니다. */}
      <div className="flex items-center justify-center gap-x-2">
        {/* 1. 왼쪽 화살표를 안으로 이동 */}
        <Icon
          src={arrowLeft}
          alt="왼쪽 이동"
          className={`hidden cursor-pointer sm:block ${isFirstPage ? 'opacity-30' : ''}`}
          onClick={!isFirstPage ? handlePrev : undefined}
        />

        {/* 2. 아이템 목록을 담는 컨테이너 */}
        <div className="flex justify-center gap-8">
          {missions.slice(startIndex, startIndex + itemsPerPage).map((v, i) => (
            <div key={i} className="flex-shrink-0">
              <img
                src={TestImg}
                alt={`이미지${v}`}
                className="h-48 w-48 rounded-lg bg-gray-100"
              />
              <p className="mt-2 w-48 truncate text-center">[지역] 상호명</p>
            </div>
          ))}
        </div>

        {/* 3. 오른쪽 화살표를 안으로 이동 */}
        <Icon
          src={arrowRight}
          alt="오른쪽 이동"
          className={`hidden cursor-pointer sm:block ${isLastPage ? 'opacity-30' : ''}`}
          onClick={!isLastPage ? handleNext : undefined}
        />
      </div>
    </div>
  )
}

export default MainMissions
