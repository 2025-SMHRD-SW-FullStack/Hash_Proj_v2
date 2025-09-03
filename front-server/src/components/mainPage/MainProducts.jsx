import React, { useState, useMemo, useEffect } from 'react';
import arrowLeft from '../../assets/icons/ic_arrow_left.svg';
import arrowRight from '../../assets/icons/ic_arrow_right.svg';
import useWindowWidth from '../../hooks/useWindowWidth.js';
import Icon from '../../components/common/Icon.jsx';
import { useProductDetail } from '../../hooks/useProductDetail.js';
import { getProducts } from '../../service/productService.js';
import { useNavigate } from 'react-router-dom';
import Product from '../product/Product.jsx';

const MainProducts = ({ label, category, limit }) => {
  const width = useWindowWidth();
  const isMobile = width < 640;
  const navigate = useNavigate();
  const goProductDetail = useProductDetail();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const allProducts = await getProducts();
        const filtered = allProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());
        setProducts(filtered);
      } catch (error) {
        console.error(`${category} 상품을 불러오는 데 실패했습니다:`, error);
      }
    };
    fetchProducts();
  }, [category]);

  const itemsPerPage = useMemo(() => {
    if (width >= 1024) return 5;
    if (width >= 768) return 4;
    if (width >= 640) return 3;
    return limit || 3; // 모바일에서는 limit 또는 기본 3개
  }, [width, limit]);

  const [startIndex, setStartIndex] = useState(0);

  const handleNext = () => {
    if (startIndex + itemsPerPage < products.length) {
      setStartIndex(prev => prev + 1);
    }
  };
  const handlePrev = () => {
    if (startIndex > 0) {
      setStartIndex(prev => prev - 1);
    }
  };

  const isFirstPage = startIndex === 0;
  const isLastPage = startIndex + itemsPerPage >= products.length;

  const visibleProducts = products.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="w-full max-w-6xl mx-auto mb-12">
      {/* 카테고리 헤더 */}
      <div className="flex justify-between items-center px-2 sm:px-4 mb-4">
        <p className="text-lg sm:text-xl font-bold">{label}</p>
        <div
          className="flex items-center gap-1 cursor-pointer group"
          onClick={() => navigate('/products', { state: { category } })}
        >
          <p className="text-sm font-semibold text-gray-600 group-hover:text-black">더보기</p>
          <Icon src={arrowRight} alt="더보기" className="w-4 h-4" />
        </div>
      </div>

      {/* 상품 리스트 */}
      {isMobile ? (
        // ✅ 모바일: 가로 스크롤 컨테이너
        <div className="flex gap-4 overflow-x-auto scrollbar-hide px-2 sm:px-4">
          {products.length === 0 ? (
            <p className="text-sm text-gray-500 w-full text-center">해당 카테고리 상품이 없습니다.</p>
          ) : (
            products.map((p) => (
              <Product key={p.id} product={p} onClick={goProductDetail} isSimple={true} />
            ))
          )}
        </div>
      ) : (
        // ✅ 데스크탑: 그리드 레이아웃과 좌우 버튼
        <div className="flex items-center justify-center gap-4">
          <Icon
            src={arrowLeft}
            alt="이전"
            className={`cursor-pointer transition-opacity ${isFirstPage ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-75'}`}
            onClick={!isFirstPage ? handlePrev : undefined}
          />
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 flex-1">
            {visibleProducts.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">해당 카테고리 상품이 없습니다.</p>
            ) : (
              visibleProducts.map((p) => (
                <Product key={p.id} product={p} onClick={goProductDetail} isSimple={true} />
              ))
            )}
          </div>
          <Icon
            src={arrowRight}
            alt="다음"
            className={`cursor-pointer transition-opacity ${isLastPage ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-75'}`}
            onClick={!isLastPage ? handleNext : undefined}
          />
        </div>
      )}
    </div>
  );
};

export default MainProducts;