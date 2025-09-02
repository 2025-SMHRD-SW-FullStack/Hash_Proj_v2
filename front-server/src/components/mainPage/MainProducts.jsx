import React, { useState, useMemo, useEffect } from 'react'
import arrowLeft from '../../assets/icons/ic_arrow_left.svg'
import arrowRight from '../../assets/icons/ic_arrow_right.svg'
import useWindowWidth from '../../hooks/useWindowWidth.js'
import Product from '../common/Product.jsx'
import Icon from '../../components/common/Icon.jsx'
import { useProductDetail } from '../../hooks/useProductDetail.js'
import { getProducts } from '../../service/productService.js'
import { useNavigate } from 'react-router-dom'

const MainProducts = ({ label, category, limit }) => {
  const width = useWindowWidth()
  const isMobile = width < 640
  const navigate = useNavigate()
  const goProductDetail = useProductDetail()
  const [products, setProducts] = useState([])

  // 카테고리별 상품 불러오기
  useEffect(() => {
    const fetchProducts = async () => {
      const all = await getProducts()
      const filtered = all.filter(p => p.category.toLowerCase() === category.toLowerCase())
      setProducts(filtered)
    }
    fetchProducts()
  }, [category])

  // 반응형 아이템 수
  const itemsPerPage = useMemo(() => {
    if (isMobile) return limit || 2
    if (width > 1024) return 5
    if (width > 640) return 3
    return 2
  }, [width, isMobile, limit])

  const [startIndex, setStartIndex] = useState(0)

  const handleNext = () => {
    if (startIndex + itemsPerPage < products.length) setStartIndex(startIndex + itemsPerPage)
  }
  const handlePrev = () => {
    if (startIndex - itemsPerPage >= 0) setStartIndex(startIndex - itemsPerPage)
  }

  const isFirstPage = startIndex === 0
  const isLastPage = startIndex + itemsPerPage >= products.length

  const visibleProducts = isMobile
    ? products // 모바일: 전체를 스크롤로 보여주기
    : products.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="w-full mb-6">
      {/* 카테고리 헤더 */}
      <div className="flex w-full justify-between items-center mb-4">
        <p className="text-base sm:text-lg font-bold">{label}</p>
        <div
          className="flex items-center gap-1 sm:gap-2 cursor-pointer"
          onClick={() => navigate('/products', { state: { category } })}
        >
          <p className="text-xs sm:text-sm font-semibold">더보기</p>
          <Icon src={arrowRight} alt="이동" className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* 상품 리스트 */}
      {isMobile ? (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-2">
          {visibleProducts.length === 0 ? (
            <p className="text-sm">해당 카테고리 상품이 없습니다.</p>
          ) : (
            visibleProducts.map((v) => (
              <Product
                key={v.id}
                product={v}
                onClick={goProductDetail}
                isSimple={true}
              />
            ))
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-x-2">
          <Icon
            src={arrowLeft}
            alt="이전"
            className={`hidden sm:block cursor-pointer ${isFirstPage ? 'opacity-30' : ''}`}
            onClick={!isFirstPage ? handlePrev : undefined}
          />
          <div className="flex gap-4 justify-center">
            {visibleProducts.length === 0 ? (
              <p>해당 카테고리 상품이 없습니다.</p>
            ) : (
              visibleProducts.map((v) => (
                <Product
                  key={v.id}
                  product={v}
                  onClick={goProductDetail}
                  isSimple={true}
                />
              ))
            )}
          </div>
          <Icon
            src={arrowRight}
            alt="다음"
            className={`hidden sm:block cursor-pointer ${isLastPage ? 'opacity-30' : ''}`}
            onClick={!isLastPage ? handleNext : undefined}
          />
        </div>
      )}
    </div>
  )
}

export default MainProducts
