// src/components/product/Product.jsx
import React, { useState } from 'react';
import testImg from '../../assets/images/ReSsol_TestImg.png';

const Product = ({ product, onClick, isSimple = false, isPowerAd = false }) => {
  if (!product) return null;

  const [imgError, setImgError] = useState(false);

  const handleClick = () => onClick?.(product.id);
  const imgSrc = product.thumbnailUrl && !imgError ? product.thumbnailUrl : testImg;
  const handleImageError = () => setImgError(true);

  return (
    // ✅ className을 w-full로 수정하여 grid 레이아웃에 맞게 변경합니다.
    <div
      className="cursor-pointer w-full relative"
      onClick={handleClick}
    >
      {isPowerAd && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
          파워광고
        </div>
      )}
      {/* ✅ aspect-w-1 aspect-h-1을 사용하여 이미지 비율을 1:1로 유지합니다. */}
      <div className="aspect-w-1 aspect-h-1">
        <img
            src={imgSrc}
            alt={product.name}
            onError={handleImageError}
            className="w-full h-full border border-solid rounded-xl object-cover"
        />
      </div>
      <div className="w-full mt-2 space-y-1 sm:space-y-2 overflow-hidden">
        <strong className="text-base sm:text-lg break-words line-clamp-2">
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
            <span className="text-xs sm:text-sm">재고수 {product.stockTotal?.toLocaleString() || 0}개</span>
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
  );
};

export default Product;