import React from 'react'
import testImg from '../../assets/images/ReSsol_TestImg.png'
import { useNavigate } from 'react-router-dom'

const Product = ({product, onClick, isSimple = false }) => {
 
    const handleClick = () => {
    // ✅ 2. 부모에게서 받은 onClick 함수가 있을 경우에만,
    //    이 상품의 id(product.id)를 담아서 실행해달라고 요청합니다.
    if (onClick) {
      onClick(product.id)
    }
  }

  return (
    <div className='w-48 cursor-pointer' onClick={handleClick}>
        <img src={testImg} alt="" className='w-48 h-48 border border-solid rounded-xl'/>
        <div className='w-full'>
            {/* 상품명 최대 19글자 */}
            <strong className='text-lg break-all'>[{product.brand}] {product.name}</strong>
            <div>
                <span className='text-lg text-[#23a4d3]'>{product.price.toLocaleString()}원 </span>
                <span className='text-sm line-through text-gray-600'>{product.originalPrice.toLocaleString()}원</span>
            </div>
            {!isSimple && (
                <>
                    <span>재고수 {product.stock.toLocaleString()}개</span>
                    <div>
                        <span>지급 포인트 {product.points.toLocaleString()}</span>
                        <span className='text-[#35A6CF]'>P</span>
                    </div>
                    <span>모집 기간 ~{product.period}</span>
                </>
                )}
        </div>

    </div>
  )
}

export default Product