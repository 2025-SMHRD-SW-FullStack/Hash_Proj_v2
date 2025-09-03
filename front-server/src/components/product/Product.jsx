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
    // ✅ max-w-[200px]를 추가해 카드가 너무 커지는 것을 방지하고, mx-auto로 그리드 셀 중앙에 배치합니다.
    <div
      className="group cursor-pointer w-full max-w-[200px] mx-auto"
      onClick={handleClick}
    >
      {/* 광고 뱃지 */}
      {isPowerAd && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
          파워광고
        </div>
      )}

      {/* 상품 이미지 (정사각형 비율 유지) */}
      <div className="aspect-square w-full overflow-hidden rounded-xl border border-gray-200">
        <img
          src={imgSrc}
          alt={product.name}
          onError={handleImageError}
          className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* ✅ 상품 정보 (mt-3로 이미지와의 간격 조정) */}
      <div className="w-full mt-3 space-y-1 overflow-hidden px-1">
        {/* ✅ 상품명 (text-base로 크기 키움) */}
        <strong className="text-base font-semibold text-gray-800 break-words line-clamp-2 leading-tight">
          [{product.brand}] {product.name}
        </strong>

        {/* ✅ 가격 (전체적으로 크기 키움) */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-[#5882F6]">
            {product.salePrice.toLocaleString()}원
          </span>
          <span className="text-sm text-gray-500 line-through">
            {product.basePrice.toLocaleString()}원
          </span>
        </div>

        {/* 상세 정보 */}
        {!isSimple && (
          // ✅ 상세 정보 폰트 크기 sm으로 조정
          <div className="text-sm text-gray-600 space-y-0.5 pt-1">
            <span>
              재고: {product.stockTotal?.toLocaleString() || 0}개
            </span>
            <div className="flex items-center gap-1">
              <span>포인트: {product.feedbackPoint?.toLocaleString() || 0}</span>
              <span className="font-bold text-[#5882F6]">P</span>
            </div>
            <span>
              ~{product.saleEndAt?.slice(0, 10)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Product;