import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { products } from '../data/TestProducts.js'
import TestImg from '../assets/images/ReSsol_TestImg.png'
import Button from '../components/common/Button'
import Icon from '../components/common/Icon.jsx'
import Minus from '../assets/icons/ic_minus.svg'
import Plus from '../assets/icons/ic_plus.svg'

const ProductDetailPage = () => {
  // ✅ URL 파라미터에서 productId를 가져옵니다.
  const { productId } = useParams()
  const product = products.find((p) => p.id === parseInt(productId))
  const [num, setNum] = useState(1)

  // ✅ 수량을 1 증가시키는 함수
  const handleIncrease = () => {
      setNum(prevNum => prevNum + 1)
  }

  // ✅ 수량을 1 감소시키는 함수 (단, 1 미만으로 내려가지 않도록)
  const handleDecrease = () => {
      setNum(prevNum => Math.max(1, prevNum - 1))
  }

  return (
    <div className='flex '>
      <div className='flex flex-col items-center h-screen w-3/4 ml-10'>
        {/* TODO: 왼쪽으로 옮기기... 이거 어뜨케함... */}
        <h2>[{product.brand}] {product.name}</h2>
        {/* ✅ 가져온 productId를 화면에 보여줍니다. */}
        <img src={TestImg} alt="" className='my-5 w-[300px]'/>
        {/* <img src={detailImg} alt="" /> */}
        <div className='h-full w-full bg-gray-400'>상세 이미지</div>
      </div>

      <aside className='sticky h-screen p-8 w-1/4 flex flex-col items-center'>
        <div className='w-full'>
            {/* 상품명 최대 19글자 */}
            <div>
                <span className='text-2xl text-[#23a4d3]'>{product.price.toLocaleString()}원 </span>
                <span className='text-lg line-through text-gray-600'>{product.originalPrice.toLocaleString()}원</span>
            </div>
            <>
                <span className='text-2xl'>재고: {product.stock.toLocaleString()}개</span>
                <div>
                    <span className='text-2xl'>지급 포인트: {product.points.toLocaleString()}</span>
                    <span className='text-[#35A6CF] text-2xl'>P</span>
                </div>
                <span className='text-2xl'>모집 기간: ~{product.period}</span>
            </>
        </div>
        <hr className="w-full border-t my-4 border-gray-200" />
          {/* 옵션 */}
          <div className='w-full mb-4'>
            <div className='flex items-center'>
                <span className='text-lg w-16'>옵션</span>
                <select className='flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500'>
                    <option value="" disabled>선택해주세요.</option>
                    {/* 예시 옵션들 */}
                    <option value="옵션1">옵션1</option>
                    <option value="옵션2">옵션2</option>
                </select>
            </div>
          </div>
        {/* ✅ 수정된 수량 섹션 */}
                <div className='w-full mb-4'>
                    <div className='flex items-center'>
                        <span className='text-lg w-16 shrink-0'>수량</span>
                        {/* flex-1을 사용하여 남은 공간을 모두 차지하도록 설정합니다. */}
                        <div className='flex flex-1 items-center justify-between p-2 border border-solid border-gray-300 rounded-md'>
                            <Icon src={Minus} alt='감소' onClick={handleDecrease} className='w-6 h-6 ' />
                            <span className='px-4 py-1 text-lg font-semibold'>{num}</span>
                            <Icon src={Plus} alt='증가' onClick={handleIncrease} className='w-6 h-6' />
                        </div>
                    </div>
                </div>
        <Button className='w-full mb-2 '>구매하기</Button>
        <div className='flex gap-2 w-full'>
          <Button variant='signUp' className='flex-1'>장바구니</Button>
          <Button variant='signUp' className='flex-1'>1:1 채팅하기</Button>
        </div>
      </aside>
      
      
    </div>
  )
}

export default ProductDetailPage