import React from 'react'
import testImg from '../../assets/images/ReSsol_TestImg.png' // 기본 이미지 경로 확인

const Product = ({ product, onClick, isSimple = false }) => {
  if (!product) return null;

  const handleClick = () => onClick?.(product.id);

  const imgSrc = product.thumbnailUrl || testImg;

  return (
    <div
      className="cursor-pointer w-[calc(50%-0.5rem)] sm:w-48 flex-shrink-0"
      onClick={handleClick}
    >
      <img
        src={imgSrc}
        alt={product.name}
        className="w-full sm:w-48 h-48 sm:h-48 border border-solid rounded-xl object-cover"
      />
      <div className="w-full mt-2 space-y-1 sm:space-y-2">
        <strong className="text-base sm:text-lg break-words">
          [{product.brand}] {product.name}
        </strong>
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg text-[#5882F6]">
            {product.salePrice.toLocaleString()}원
          </span>
          <span className="text-xs sm:text-sm line-through text-gray-600">
            {product.basePrice.toLocaleString()}원
          </span>
        </div>
        {!isSimple && (
          <>
            <span className="text-xs sm:text-sm">
              재고수 {product.stockTotal?.toLocaleString() || 0}개
            </span>
            <div className="text-xs sm:text-sm flex items-center gap-1">
              <span>지급 포인트 {product.feedbackPoint.toLocaleString()}</span>
              <span className="text-[#5882F6]">P</span>
            </div>
            <span className="text-xs sm:text-sm">
              모집 기간 ~{product.saleEndAt?.slice(0, 10)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

export default Product
