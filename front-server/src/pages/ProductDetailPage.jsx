import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import TestImg from '../assets/images/ReSsol_TestImg.png'
import Button from '../components/common/Button.jsx'
import Icon from '../components/common/Icon.jsx'
import Minus from '../assets/icons/ic_minus.svg'
import Plus from '../assets/icons/ic_plus.svg'
import Delete from '../assets/icons/ic_delete.svg'
import Modal from '../components/common/Modal.jsx'
import { getProductDetail } from '../service/productService.js'
import { addCartItem } from '../service/cartService.js'
import useAuthStore from '../stores/authStore'
import { findOrCreateUserSellerRoom, findOrCreateRoomByProduct } from '../service/chatService'

const ProductDetailPage = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useAuthStore()

  const [productData, setProductData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const deliverFee = 3000

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const data = await getProductDetail(productId)
        setProductData(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [productId])

  const handleOptionChange = (e) => {
    const selectedVariantId = e.target.value
    if (!selectedVariantId) return
    const isAlreadySelected = selectedItems.some(item => item.variantId === selectedVariantId)
    if (isAlreadySelected) {
      alert('이미 선택된 옵션입니다.')
      e.target.value = ''
      return
    }
    setSelectedItems(prev => [...prev, { variantId: selectedVariantId, quantity: 1 }])
    e.target.value = ''
  }

  const handleQuantityChange = (variantId, amount) => {
    setSelectedItems(prev =>
      prev.map(item => item.variantId === variantId
        ? { ...item, quantity: Math.max(1, item.quantity + amount) }
        : item
      )
    )
  }

  const handleRemoveItem = (variantId) => {
    setSelectedItems(prev => prev.filter(item => item.variantId !== variantId))
  }

  const handlePurchase = () => {
    if (selectedItems.length === 0) {
      alert('상품 옵션을 선택해주세요.')
      return
    }
    const itemsQuery = selectedItems.map(item => `${item.variantId}_${item.quantity}`).join(',')
    navigate(`/user/order?productId=${productId}&items=${itemsQuery}`)
  }

  const handleAddToCart = async () => {
    if (!productData || selectedItems.length === 0) {
      alert('상품 옵션을 선택해주세요.')
      return
    }
    const { product, variants } = productData
    const labels = [product.option1Name, product.option2Name, product.option3Name, product.option4Name, product.option5Name]

    try {
      for (const item of selectedItems) {
        const variant = variants.find(v => v.id === parseInt(item.variantId))
        if (!variant) continue
        const options = {}
        if (labels[0]) options[labels[0]] = variant.option1Value ?? null
        if (labels[1]) options[labels[1]] = variant.option2Value ?? null
        if (labels[2]) options[labels[2]] = variant.option3Value ?? null
        if (labels[3]) options[labels[3]] = variant.option4Value ?? null
        if (labels[4]) options[labels[4]] = variant.option5Value ?? null

        await addCartItem({ productId: product.id, qty: item.quantity, options })
      }
      setIsCartModalOpen(true)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || '장바구니 담기 중 오류가 발생했습니다.'
      alert(msg)
    }
  }

  // 상품 → 셀러ID 추출(가능하면 사용)
  const getSellerId = (pd) => {
    const p = pd?.product || {}
    return p.sellerId ?? p.seller_id ?? p.seller?.id ?? pd?.sellerId ?? null
  }

  const handleOpenChat = async () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { redirectTo: location.pathname } })
      return
    }
    if (!productData) return

    try {
      setChatLoading(true)
      const sid = getSellerId(productData)
      const room = sid
        ? await findOrCreateUserSellerRoom(sid)
        : await findOrCreateRoomByProduct(Number(productId)) // ✅ sellerId가 없으면 상품ID로 매칭
      navigate(`/user/chat/rooms/${room.roomId}`)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || '채팅방 생성 중 오류가 발생했습니다.'
      alert(msg)
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) return <div>상품 정보를 불러오는 중...</div>
  if (error) return <div>오류: {error}</div>
  if (!productData) return <div>상품 정보가 없습니다.</div>

  const { product, variants } = productData

  const totalPrice = selectedItems.reduce((total, currentItem) => {
    const variant = variants.find(v => v.id === parseInt(currentItem.variantId))
    const itemPrice = (product.salePrice + (variant?.addPrice || 0)) * currentItem.quantity
    return total + itemPrice + deliverFee
  }, 0)

  return (
    <div className='flex items-start'>
      {/* 왼쪽 */}
      <div className='ml-10 w-3/4'>
        <div className='flex flex-col items-center'>
          <h2 className='my-4 text-2xl font-bold'>[{product.brand}] {product.name}</h2>
          <img src={TestImg} alt={product.name} className='my-5 w-[300px]'/>
        </div>

        <div className={`w-full overflow-hidden bg-gray-100 transition-all duration-500 ease-in-out ${isDescriptionExpanded ? 'max-h-full' : 'max-h-96'}`}>
          <div dangerouslySetInnerHTML={{ __html: product.detailHtml }} />
        </div>

        <div className='my-4 flex justify-center'>
          <Button variant="signUp" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className='w-full'>
            {isDescriptionExpanded ? '접기' : '더보기'}
          </Button>
        </div>
      </div>

      {/* 오른쪽: 구매 옵션 패널 */}
      <aside className='sticky top-8 flex w-1/4 flex-col p-8'>
        <div className='w-full'>
          <div>
            <span className='text-2xl text-[#23a4d3]'>{product.salePrice.toLocaleString()}원&ensp;</span>
            <span className='text-lg text-gray-600 line-through'>{product.basePrice.toLocaleString()}원</span>
          </div>
          <div>
            <span className='text-xl'>배송비 {deliverFee.toLocaleString()}원&ensp;</span>
            <span className='text-lg text-gray-600'>배송 예상 소요일 최대 3일</span>
          </div>
          <span className='text-2xl'>재고: {product.stockTotal.toLocaleString()}개</span>
          <div>
            <span className='text-2xl'>지급 포인트: {product.feedbackPoint.toLocaleString()}</span>
            <span className='text-2xl text-[#23a4d3]'>P</span>
          </div>
          <span className='text-2xl'>모집 기간: ~{product.saleEndAt?.slice(0, 10)}</span>
        </div>

        <hr className="my-4 w-full border-t border-gray-200" />

        <div className='mb-4 w-full'>
          <select onChange={handleOptionChange} defaultValue="" className='w-full rounded-md border border-gray-300 p-2'>
            <option value="">선택해주세요.</option>
            {variants.map(v => (
              <option key={v.id} value={v.id} disabled={v.stock === 0}>
                {`${v.option1Value ?? ''} ${v.option2Value ?? ''}`.trim()}
                {v.addPrice > 0 ? ` (+${v.addPrice.toLocaleString()}원)` : ''}
                {v.stock === 0 ? ' (품절)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className='space-y-3 pr-2'>
          {selectedItems.map(item => {
            const variant = variants.find(v => v.id === parseInt(item.variantId))
            if (!variant) return null
            const itemPrice = (product.salePrice + (variant.addPrice || 0)) * item.quantity

            return (
              <div key={item.variantId} className='rounded-md bg-gray-100 p-3'>
                <div className='flex items-start justify-between'>
                  <p className='max-w-[80%] text-sm text-gray-700'>{`${variant.option1Value ?? ''} ${variant.option2Value ?? ''}`.trim()}</p>
                  <Icon src={Delete} alt="삭제" className='h-4 w-4 cursor-pointer' onClick={() => handleRemoveItem(item.variantId)} />
                </div>
                <div className='mt-2 flex items-center justify-between'>
                  <div className='flex items-center justify-between rounded-md border border-solid border-gray-300 bg-white p-1'>
                    <Icon src={Minus} alt='감소' onClick={() => handleQuantityChange(item.variantId, -1)} className='h-5 w-5 cursor-pointer' />
                    <span className='px-3 text-base font-semibold'>{item.quantity}</span>
                    <Icon src={Plus} alt='증가' onClick={() => handleQuantityChange(item.variantId, 1)} className='h-5 w-5 cursor-pointer' />
                  </div>
                  <span className='text-base font-bold'>{itemPrice.toLocaleString()}원</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className='pt-4'>
          {selectedItems.length > 0 && (
            <div className='mb-4 flex items-center justify-between'>
              <span className='text-lg font-bold'>총 상품 금액</span>
              <span className='text-2xl font-bold'>{totalPrice.toLocaleString()}원</span>
            </div>
          )}
          <Button className='mb-2 w-full' onClick={handlePurchase}>구매하기</Button>
          <div className='flex w-full gap-2'>
            <Button variant='signUp' className='flex-1' onClick={handleAddToCart}>장바구니</Button>
            <Button variant='signUp' className='flex-1' onClick={handleOpenChat} disabled={chatLoading}>
              {chatLoading ? '열고 있어요…' : '1:1 문의하기'}
            </Button>
          </div>
        </div>
      </aside>

      <Modal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        title="🛒 장바구니 안내"
        footer={
          <>
            <Button variant="signUp" onClick={() => setIsCartModalOpen(false)}>닫기</Button>
            <Button onClick={() => navigate('/user/mypage/cart')}>장바구니 바로가기</Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">선택한 상품이 장바구니에 담겼습니다.</p>
      </Modal>
    </div>
  )
}

export default ProductDetailPage
