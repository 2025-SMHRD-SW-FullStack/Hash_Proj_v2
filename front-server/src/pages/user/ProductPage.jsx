import React, { useState, useEffect } from 'react';
import Product from '../../components/common/Product.jsx';
import { useProductDetail } from '../../hooks/useProductDetail.js';
import Button from '../../components/common/Button.jsx';
import Icon from '../../components/common/Icon.jsx';
import magnifier from '../../assets/icons/ic_magnifier.svg';
import { getProducts } from '../../service/productService.js'; // ✅ API 서비스 import

const ProductPage = () => {
  const goProductDetail = useProductDetail();

  // --- ✅ 상태 관리 ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('전체');

  // --- ✅ 데이터 로딩 ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []); // 페이지가 처음 로드될 때 한 번만 실행

  const categories = ['전체', '전자제품', '화장품', '밀키트', '플랫폼'];

  const filteredProducts = products.filter((product) => {
    if (selectedCategory === '전체') return true;
    return product.category === selectedCategory;
  });

  // --- ✅ 렌더링 로직 ---
  if (loading) return <div>상품 목록을 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return (
    <div className='w-full flex flex-col items-center justify-center'>
      <div className='flex items-center gap-3 my-4'>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'primary' : 'unselected'}
            className='px-16'
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
        <div className='flex items-center border border-solid border-[#C3C3C3] rounded-lg'>
          <input type="text" className='border-none h-[80%]' />
          <Icon src={magnifier} alt='검색' className='mr-3'/>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-16 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {/* ✅ Product 컴포넌트에 product 객체를 그대로 전달 */}
        {filteredProducts.map((product) => (
          <Product key={product.id} product={product} onClick={goProductDetail} />
        ))}
      </div>
    </div>
  );
};

export default ProductPage;