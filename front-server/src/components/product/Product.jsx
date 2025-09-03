import React, { useState } from 'react';
import testImg from '../../assets/images/ReSsol_TestImg.png';

const Product = ({ product, onClick, isSimple = false, isPowerAd = false }) => {
  if (!product) return null;

  const [imgError, setImgError] = useState(false);

  const handleClick = () => onClick?.(product.id);
  const imgSrc = product.thumbnailUrl && !imgError ? product.thumbnailUrl : testImg;
  const handleImageError = () => setImgError(true);

  return (
    <div
      className="cursor-pointer w-[40%] max-w-[150px] sm:w-48 flex-shrink-0 relative"
      onClick={handleClick}
    >
      {/* 이미지 영역 */}
      <div className="relative w-full aspect-square">
        {isPowerAd && (
          <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            파워광고
          </div>
        )}
        <img
          src={imgSrc}
          alt={product.name}
          onError={handleImageError}
          className="w-full h-full object-cover object-center rounded-xl"
        />
      </div>

      {/* 상품 정보 영역 */}
      <div className="w-full mt-2 space-y-1 sm:space-y-2">
        {/* 상품명 */}
        <strong className="text-base sm:text-lg break-words line-clamp-2">
          [{product.brand}] {product.name}
        </strong>

        {/* 가격 */}
        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg text-[#5882F6]">
            {product.salePrice.toLocaleString()}원
          </span>
          <span className="text-xs sm:text-sm line-through text-gray-600">
            {product.basePrice.toLocaleString()}원
          </span>
        </div>

        {/* 상세 정보 */}
        {!isSimple && (
          <>
            <span className="text-xs sm:text-sm">
              재고수 {product.stockTotal?.toLocaleString() || 0}개
            </span>
            <div className="text-xs sm:text-sm flex items-center gap-1">
              <span>지급 포인트 {product.feedbackPoint?.toLocaleString() || 0}</span>
              <span className="text-[#5882F6]">P</span>
            </div>
            <span className="text-xs sm:text-sm">
              모집 기간 ~{product.saleEndAt?.slice(0, 10)}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default Product;
