// src/components/product/Product.jsx
import React, { useState } from 'react';
import testImg from '../../assets/images/ReSsol_TestImg.png';

const Product = ({ product, onClick, isSimple = false, isPowerAd = false }) => {
  if (!product) return null;

  const [imgError, setImgError] = useState(false);

  const handleClick = () => onClick?.(product.id);
  const imgSrc = product.thumbnailUrl && !imgError ? product.thumbnailUrl : testImg;
  const handleImageError = () => setImgError(true);

  // ★★★ 수정: 즉시 할인이 적용되었는지 여부를 확인하는 변수
  const hasDiscount = product.salePrice > 0;

  return (
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

      {/* 상품 정보 */}
      <div className="w-full mt-3 space-y-1 overflow-hidden px-1">
        <strong className="text-base font-semibold text-gray-800 break-words line-clamp-2 leading-tight">
          [{product.brand}] {product.name}
        </strong>

        {/* ★★★ 수정: hasDiscount 값에 따라 가격 표시를 다르게 함 */}
        <div className="flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              {/* 할인이 있을 경우: 할인가(파란색)와 원가(취소선) 표시 */}
              <span className="text-lg font-bold text-primary">
                {product.salePrice.toLocaleString()}원
              </span>
              <span className="text-sm text-gray-500 line-through">
                {product.basePrice.toLocaleString()}원
              </span>
            </>
          ) : (
            <>
              {/* 할인이 없을 경우: 원가만 표시 */}
              <span className="text-lg font-bold text-primary">
                {product.basePrice.toLocaleString()}원
              </span>
            </>
          )}
        </div>

        {/* 상세 정보 */}
        {!isSimple && (
          <div className="text-sm text-gray-600 space-y-0.5 pt-1">
            <span>
              재고: {product.stockTotal?.toLocaleString() || 0}개
            </span>
            <div className="flex items-center gap-1">
              <span>포인트: {product.feedbackPoint?.toLocaleString() || 0}</span>
              <span className="font-bold text-primary">P</span>
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