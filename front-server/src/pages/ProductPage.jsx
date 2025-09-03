// src/pages/ProductPage.jsx
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
          src={ad.bannerImageUrl || "https://via.placeholder.com/192"}
          alt={ad.productName || '광고 상품'}
          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
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
  const [selectedCategory, setSelectedCategory] = useState(categoryFromState);
  const [searchText, setSearchText] = useState('');
  const [powerAds, setPowerAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const containerRef = useRef(null);
  const categories = ['전체', '전자제품', '화장품', '밀키트', '무형자산'];

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const productData = await getProducts();
        setProducts(productData);

        if (selectedCategory !== '전체') {
          setLoadingAds(true);
          const adData = await getActiveAds(AD_SLOT_TYPES.CATEGORY_TOP, selectedCategory);
          setPowerAds(adData);
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
    if (selectedCategory !== '전체' && product.category !== selectedCategory) return false;
    if (searchText && !product.name.toLowerCase().includes(searchText.toLowerCase())) return false;
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

  if (loading) return <div>상품 목록을 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return (
    // ✅ 이 div에 max-w-7xl mx-auto를 추가하여 전체 너비를 제한합니다.
    <div ref={containerRef} className='max-w-7xl mx-auto flex flex-col items-center px-4'>
      {/* 모바일: select + 검색바 */}
      <div className="sm:hidden w-full my-4 flex flex-col gap-2">
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <div className='flex items-center border border-solid border-gray-300 rounded-lg px-2 focus-within:ring-1 focus-within:ring-primary'>
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
        <div className='flex items-center border border-solid border-gray-300 rounded-lg px-2 ml-4 flex-1 max-w-sm focus-within:ring-1 focus-within:ring-primary'>
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
        powerAds.length > 0 && selectedCategory !== '전체' && (
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
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredProducts.slice(0, displayCount).map((product) => (
          <Product key={product.id} product={product} onClick={goProductDetail} />
        ))}
      </div>

      {isLoadingMore && <p className="w-full text-center py-4 text-gray-500">더 많은 상품을 불러오는 중...</p>}
    </div>
  );
};

export default ProductPage;