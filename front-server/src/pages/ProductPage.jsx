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

const PowerAdProduct = ({ ad, onClick }) => {
  const handleClick = () => {
    if (!ad.house && ad.productId) onClick(ad.productId);
  };

  return (
    <div
      className={`relative cursor-${!ad.house && ad.productId ? 'pointer' : 'default'} w-[calc(50%-0.5rem)] sm:w-48 flex-shrink-0 group`}
      onClick={handleClick}
    >
      <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
        Sponsored
      </div>
      <img
        src={ad.bannerImageUrl || "https://via.placeholder.com/192"}
        alt={ad.productName || '광고 상품'}
        className="w-full sm:w-48 h-48 sm:h-48 border border-solid rounded-xl object-cover group-hover:opacity-80 transition-opacity"
      />
      <div className="w-full mt-2 space-y-1 sm:space-y-2">
        <strong className="text-base sm:text-lg break-words">
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
  const [selectedCategory, setSelectedCategory] = useState(categoryFromState);
  const [searchText, setSearchText] = useState('');
  const [powerAds, setPowerAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const containerRef = useRef(null);
  const categories = ['전체', '전자제품', '화장품', '밀키트', '플랫폼'];

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const productData = await getProducts();
        setProducts(productData);

        setLoadingAds(true);
        const adData = await getActiveAds(AD_SLOT_TYPES.CATEGORY_TOP, selectedCategory);
        setPowerAds(adData);
        setLoadingAds(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [selectedCategory]);

  const filteredProducts = products.filter((product) => {
    if (selectedCategory !== '전체' && product.category !== selectedCategory) return false;
    if (searchText && !product.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // 무한 스크롤 처리
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, clientHeight, scrollHeight } = document.documentElement;
      if (scrollTop + clientHeight + 100 >= scrollHeight && displayCount < filteredProducts.length) {
        setIsLoadingMore(true);
        setTimeout(() => { // 로딩 표시를 위해 setTimeout 적용
          setDisplayCount((prev) => Math.min(prev + 20, filteredProducts.length));
          setIsLoadingMore(false);
        }, 500);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayCount, filteredProducts.length]);

  if (loading) return <div>상품 목록을 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return (
    <div ref={containerRef} className='w-full flex flex-col items-center px-4'>
      {/* 모바일: select + 검색바 */}
      <div className="sm:hidden w-full my-4 flex flex-col gap-2">
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <div className='flex items-center border border-solid border-[#C3C3C3] rounded-lg px-2'>
          <input
            type="text"
            className='border-none h-[32px] px-2 outline-none w-full'
            placeholder="검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Icon src={magnifier} alt='검색' className='w-5 h-5 mr-2'/>
        </div>
      </div>

      {/* 데스크탑: 버튼 + 검색바 */}
      <div className='hidden sm:flex flex-wrap items-center gap-2 my-4 w-full'>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'primary' : 'unselected'}
            className='px-6 py-2'
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
        <div className='flex items-center border border-solid border-[#C3C3C3] rounded-lg px-2 ml-4 flex-1 max-w-sm'>
          <input
            type="text"
            className='border-none h-[32px] px-2 outline-none w-full'
            placeholder="검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Icon src={magnifier} alt='검색' className='w-5 h-5 mr-2'/>
        </div>
      </div>

      {/* 파워 광고 */}
      {loadingAds ? (
        <p className="w-full text-center py-4">광고를 불러오는 중입니다...</p>
      ) : (
        powerAds.length > 0 && (
          <div className="w-full mb-8">
            <h2 className="text-lg font-bold mb-4 border-b pb-2">🔥 추천 상품</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {powerAds.map((ad, index) => (
                <PowerAdProduct key={ad.slotId || index} ad={ad} onClick={goProductDetail} />
              ))}
            </div>
            <hr className="my-8" />
          </div>
        )
      )}

      {/* 일반 상품 목록 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredProducts.slice(0, displayCount).map((product) => (
          <Product key={product.id} product={product} onClick={goProductDetail} />
        ))}
      </div>

      {/* 스크롤 끝 로딩 표시 */}
      {isLoadingMore && <p className="w-full text-center py-4 text-gray-500">상품을 불러오는 중...</p>}
    </div>
  );
};

export default ProductPage;
