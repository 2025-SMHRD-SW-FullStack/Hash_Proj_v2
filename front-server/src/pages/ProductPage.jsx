import React, { useState, useEffect, useRef } from 'react';
import Product from '../components/product/Product.jsx';
import { useProductDetail } from '../hooks/useProductDetail.js';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import magnifier from '../assets/icons/ic_magnifier.svg';
import { getProducts } from '../service/productService.js';
import { getActiveAds } from '../service/adsService.js';
import { AD_SLOT_TYPES } from '../constants/ads.js';

const ProductPage = () => {
  const goProductDetail = useProductDetail();

  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchText, setSearchText] = useState('');
  const [powerAds, setPowerAds] = useState([]);

  const productsPerPage = 20;
  const pageRef = useRef(1);

  const categories = ['전체', '전자제품', '화장품', '밀키트', '플랫폼'];

  // 데이터 fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const productData = await getProducts();
        setProducts(productData);

        const adData = await getActiveAds(AD_SLOT_TYPES.CATEGORY_TOP, selectedCategory);
        setPowerAds(adData.slice(0, 5)); // 광고 상단 5개만
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedCategory]);

  // 필터 + 검색
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === '전체' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCategory && matchSearch;
  });

  // 초기 표시
  useEffect(() => {
    setDisplayedProducts(filteredProducts.slice(0, productsPerPage));
    pageRef.current = 1;
  }, [filteredProducts]);

  // 무한 스크롤
  const handleScroll = () => {
    if (
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
      !loadingMore &&
      displayedProducts.length < filteredProducts.length
    ) {
      setLoadingMore(true);
      setTimeout(() => {
        const nextPage = pageRef.current + 1;
        const newProducts = filteredProducts.slice(0, nextPage * productsPerPage);
        setDisplayedProducts(newProducts);
        pageRef.current = nextPage;
        setLoadingMore(false);
      }, 500);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });

  if (loading) return <div>상품 목록을 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return (
    <div className="w-full flex flex-col items-center px-4">
      {/* 모바일 select + 검색 */}
      <div className="w-full flex flex-col sm:flex-row items-center gap-2 my-4">
        <select
          className="border border-gray-300 rounded-lg px-2 py-1 w-full sm:w-auto"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center border border-gray-300 rounded-lg px-2 w-full sm:w-auto">
          <input
            type="text"
            className="border-none h-8 px-2 outline-none w-full"
            placeholder="검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Icon src={magnifier} alt="검색" className="w-5 h-5 mr-2" />
        </div>
      </div>

      {/* 광고 상단 */}
      {powerAds.length > 0 && (
        <div className="w-full mb-8">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">🔥 추천 파워광고</h2>
          <div className="flex flex-wrap gap-2">
            {powerAds.map((ad) => (
              <Product key={ad.id} product={ad} onClick={goProductDetail} isPowerAd />
            ))}
          </div>
          <hr className="my-8" />
        </div>
      )}

      {/* 일반 상품 목록 */}
      <div className="flex flex-wrap gap-2">
        {displayedProducts.map((p) => (
          <Product key={p.id} product={p} onClick={goProductDetail} />
        ))}
      </div>

      {loadingMore && <p className="py-4 text-center">로딩 중...</p>}
    </div>
  );
};

export default ProductPage;
