import React, { useState, useEffect } from 'react';
import Product from '../components/common/Product.jsx';
import { useProductDetail } from '../hooks/useProductDetail.js';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import magnifier from '../assets/icons/ic_magnifier.svg';
import { getProducts } from '../service/productService.js';
import { useLocation } from 'react-router-dom';

const ProductPage = () => {
  const goProductDetail = useProductDetail();
  const location = useLocation();
  const categoryFromState = location.state?.category || '전체';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromState);

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
  }, []);

  const categories = ['전체', '전자제품', '화장품', '밀키트', '플랫폼'];

  const filteredProducts = products.filter((product) => {
    if (selectedCategory === '전체') return true;
    return product.category === selectedCategory;
  });

  if (loading) return <div>상품 목록을 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return (
    <div className='w-full flex flex-col items-center px-4'>
      <div className='flex flex-wrap items-center gap-2 my-4'>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'primary' : 'unselected'}
            className='px-6 py-2'
            onClick={() => setSelectedCategory(category)}
          >
            {category === '전자제품' ? '전자제품' :
             category === '화장품' ? '화장품' :
             category === '밀키트' ? '밀키트' :
             category === '플랫폼' ? '플랫폼' : '전체'}
          </Button>
        ))}
        <div className='flex items-center border border-solid border-[#C3C3C3] rounded-lg px-2 ml-4'>
          <input type="text" className='border-none h-[32px] px-2 outline-none' placeholder="검색" />
          <Icon src={magnifier} alt='검색' className='w-5 h-5 mr-2'/>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredProducts.map((product) => (
          <Product key={product.id} product={product} onClick={goProductDetail} />
        ))}
      </div>
    </div>
  );
};

export default ProductPage;
