import React, { useState, useEffect, useRef } from 'react';
import Product from '../components/product/Product.jsx';
import { useProductDetail } from '../hooks/useProductDetail.js';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import magnifier from '../assets/icons/ic_magnifier.svg';
import { getProducts } from '../service/productService.js';
import { useLocation } from 'react-router-dom';
import { getActiveAds } from '../service/adsService.js';
import { AD_SLOT_TYPES } from '../constants/ads.js';
import CategorySelect from '../components/common/CategorySelect.jsx';
import DefaultAdImg from "../assets/images/ReSsol_TestImg.png"

// PowerAdProduct 컴포넌트는 이전과 동일하게 유지합니다.
const PowerAdProduct = ({ ad, onClick }) => {
  const handleClick = () => {
    if (!ad.house && ad.productId) onClick(ad.productId);
  };

  return (
    <div
      className={`relative cursor-${!ad.house && ad.productId ? 'pointer' : 'default'} w-full max-w-[200px] mx-auto group`}
      onClick={handleClick}
    >
      <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
        파워광고
      </div>
      <div className="aspect-square w-full overflow-hidden rounded-xl border border-gray-200">
        <img
          src={ad.bannerImageUrl || DefaultAdImg}
          alt={ad.productName || '광고 상품'}
          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = DefaultAdImg; }}
        />
      </div>
      <div className="w-full mt-3 px-1">
        <strong className="text-base break-words">
          {ad.productName || '특별한 상품을 만나보세요!'}
        </strong>
      </div>
    </div>
  );
};


const ProductPage = () => {
  const goProductDetail = useProductDetail();
  const location = useLocation();
  const categoryFromState = location.state?.category || '전체';
  

  const [products, setProducts] = useState([]);
  const [displayCount, setDisplayCount] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState({
    value: categoryFromState,
    label: categoryFromState,
  });
  const [searchText, setSearchText] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [powerAds, setPowerAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const containerRef = useRef(null);
  const categories = [
    { value: "전체", label: "전체" },
    { value: "전자제품", label: "전자제품" },
    { value: "화장품", label: "화장품" },
    { value: "밀키트", label: "밀키트" },
    { value: "무형자산", label: "무형자산" },
  ];

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const productData = await getProducts();
        setProducts(productData);
        const byId = new Map(productData.map(p => [p.id, p]));

        if (selectedCategory.value !== '전체') {
          setLoadingAds(true);
          const adData = await getActiveAds(AD_SLOT_TYPES.CATEGORY_TOP, selectedCategory.value);
          // ▽ 상품형 광고는 bannerImageUrl이 비어있을 수 있으니, productId로 보강
          const hydrated = (adData || []).map(ad => {
            const p = ad.productId ? byId.get(ad.productId) : null;
            return {
              ...ad,
              productName: ad.productName ?? p?.name ?? '특별한 상품을 만나보세요!',
              bannerImageUrl: ad.bannerImageUrl ?? p?.thumbnailUrl ?? '',
            };
          });
          setPowerAds(hydrated);
          setLoadingAds(false);
        } else {
          setPowerAds([]);
        }

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [selectedCategory]);

  const filteredProducts = products.filter((product) => {
  // selectedCategory.value가 "전체"면 모든 카테고리 허용
  if (selectedCategory.value !== '전체' && product.category !== selectedCategory.value) return false;
  if (activeSearchTerm && !product.name.toLowerCase().includes(activeSearchTerm.toLowerCase())) return false;
  return true;
});

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop + 100 >= document.documentElement.scrollHeight && !isLoadingMore) {
        if (displayCount < filteredProducts.length) {
            setIsLoadingMore(true);
            setTimeout(() => {
                setDisplayCount(prev => prev + 20);
                setIsLoadingMore(false);
            }, 500);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayCount, filteredProducts.length, isLoadingMore]);

  if (error) return <div>오류: {error}</div>;

  // 검색 실행 및 Enter 키 처리를 위한 함수들 (컴포넌트 내부에 위치)
  const handleSearch = () => {
    const term = searchText.trim();
    setActiveSearchTerm(term);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    // ✅ 이 div에 max-w-7xl mx-auto를 추가하여 전체 너비를 제한합니다.
    <div ref={containerRef} className='max-w-7xl mx-auto flex flex-col px-4 mb-4'>
      {/* 모바일: CategorySelect + 검색바  */}
      <div className="sm:hidden my-4  flex items-center gap-2 ">
          <CategorySelect
            categories={categories}
            selected={selectedCategory}
            onChange={setSelectedCategory}
            className="w-[40%]"
          />

        {/* 검색창, 내부 아이콘, 검색 버튼을 모두 포함하는 컨테이너 */}
        <div className="relative flex-1 flex items-center">
          <input
          type="text"
          className="w-full pr-2 py-2 border-0 border-b border-gray-300 bg-transparent
             focus:outline-none focus:ring-0 focus:border-b-2 focus:border-transparent  focus:border-b-primary 
             transition-all duration-200 placeholder-gray-400"
          placeholder="상품명을 입력하세요"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          />

          {/* 3. 우측의 클릭 가능한 검색 버튼 */}
          <button
            onClick={handleSearch}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full 
                      bg-transparent transition-all duration-200 border-none
                      hover:bg-gray-200 
                      focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
          >
            <Icon src={magnifier} alt="검색 실행" className="w-5 h-5 text-gray-600" />
          </button>
      </div>
      </div>


      {/* 데스크탑: 버튼 + 검색바 */}
      <div className='hidden sm:flex flex-wrap items-center gap-2 my-4 w-full justify-between mx-4 '>
        <div className='flex items-center gap-2'>
          {categories.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory.value === category.value ? 'primary' : 'unselected'}
              className="px-4 py-2"
              onClick={() => setSelectedCategory(category)}
            >
              {category.label}
            </Button>
          ))}

        </div>

        {/* 검색바 */}
        <div className="relative w-full max-w-sm flex items-center">
          <input
          type="text"
          className="w-full pr-2 py-2 border-0 border-b border-gray-300 bg-transparent
             focus:outline-none focus:ring-0 focus:border-b-2 focus:border-transparent  focus:border-b-primary 
             transition-all duration-200 placeholder-gray-400"
          placeholder="상품명을 입력하세요"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          />

          {/* 검색 버튼 */}
          <button
            onClick={handleSearch}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full 
                      bg-transparent transition-all duration-200 border-none
                      hover:bg-gray-200 
                      focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
          >
            <Icon src={magnifier} alt="검색 실행" className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>



      {/* 파워 광고 */}
      {loadingAds ? (
        <p className="w-full text-center py-4">광고를 불러오는 중입니다...</p>
      ) : (
        powerAds.length > 0 && selectedCategory.value !== '전체' && (
          <div className="w-full mb-8">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">🔥 추천 상품</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {powerAds.map((ad, index) => (
                <PowerAdProduct key={ad.slotId || index} ad={ad} onClick={goProductDetail} />
              ))}
            </div>
            <hr className="my-8" />
          </div>
        )
      )}

      {/* 일반 상품 목록 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 w-full">
        {filteredProducts.slice(0, displayCount).map((product) => (
          <Product key={product.id} product={product} onClick={goProductDetail} />
        ))}
      </div>


      {isLoadingMore && <p className="w-full text-center py-4 text-gray-500">더 많은 상품을 불러오는 중...</p>}
    </div>
  );
};

export default ProductPage;