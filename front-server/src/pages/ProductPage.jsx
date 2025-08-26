import React, { useState } from 'react'
import Product from '../components/common/Product'
import { useNavigate } from 'react-router-dom'
import { products } from '../data/TestProducts.js'
import { useProductDetail } from '../hooks/useProductDetail.js'
import Button from '../components/common/Button.jsx'
import TextField from '../components/common/TextField.jsx'
import magnifier from '../assets/icons/ic_magnifier.svg'
import Icon from '../components/common/Icon.jsx'

const ProductPage = () => {

  const navigate = useNavigate() // ✅ 페이지 이동을 위해 navigate를 사용합니다.
  const goProductDetail = useProductDetail()

  const categories = ['전체', '전자제품', '화장품', '밀키트', '플랫폼']

  // ✅ 'selectedCategory'라는 이름으로 상태를 만들고, 기본값으로 '전체'를 설정합니다.
  const [selectedCategory, setSelectedCategory] = useState('전체')

  // ✅ 렌더링 전에 필터링 로직을 추가합니다.
  const filteredProducts = products.filter((product) => {
    // 만약 선택된 카테고리가 '전체'라면, 모든 상품을 보여줍니다 (true).
    if (selectedCategory === '전체') {
      return true
    }
    // 그렇지 않다면, 상품의 카테고리와 선택된 카테고리가 같은 것만 보여줍니다.
    return product.category === selectedCategory
  })


  return (
    <div className='w-full flex flex-col items-center justify-center'>
        <div className='flex items-center gap-3 my-4'>
        {/* ✅ 배열(categories)을 map으로 돌려 버튼들을 생성합니다. */}
        {categories.map((category) => (
          <Button
            key={category}
            // ✅ 현재 선택된 카테고리면 'primary', 아니면 'unselected' 스타일을 적용합니다.
            variant={selectedCategory === category ? 'primary' : 'unselected'}
            className='px-16'
            // ✅ 버튼을 누르면 selectedCategory 상태를 해당 카테고리 이름으로 변경합니다.
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
        {/* ✅ .map()을 사용해 상품 목록을 동적으로 렌더링합니다. */}
        {filteredProducts.map((product) => (
          <Product key={product.id} product={product} onClick={goProductDetail} />
        ))}
      </div>
    </div>
    // ✅ 여러 상품을 감싸는 grid 레이아웃을 사용하면 보기 좋습니다.
  )
}

export default ProductPage