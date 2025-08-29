import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TestImg from '../assets/images/ReSsol_TestImg.png';
import Button from '../components/common/Button.jsx';
import Icon from '../components/common/Icon.jsx';
import Minus from '../assets/icons/ic_minus.svg';
import Plus from '../assets/icons/ic_plus.svg';
import Delete from '../assets/icons/ic_delete.svg';
import Modal from '../components/common/Modal.jsx'; // ✅ 공통 모달 import
import { getProductDetail } from '../service/productService.js';
import useCartStore from '../stores/cardStore.js';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCartStore();

  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const deliverFee = 3000;

  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // ✅ 모달 상태
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProductDetail(productId);
        setProductData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleOptionChange = (e) => {
    const selectedVariantId = e.target.value;
    if (!selectedVariantId) return;

    const isAlreadySelected = selectedItems.some(item => item.variantId === selectedVariantId);
    if (isAlreadySelected) {
      alert('이미 선택된 옵션입니다.');
      e.target.value = '';
      return;
    }

    setSelectedItems(prevItems => [
      ...prevItems,
      { variantId: selectedVariantId, quantity: 1 }
    ]);
    
    e.target.value = '';
  };
  
  const handleQuantityChange = (variantId, amount) => {
    setSelectedItems(prevItems => 
      prevItems.map(item => {
        if (item.variantId === variantId) {
          const newQuantity = item.quantity + amount;
          return { ...item, quantity: Math.max(1, newQuantity) };
        }
        return item;
      })
    );
  };
  
  const handleRemoveItem = (variantId) => {
    setSelectedItems(prevItems => prevItems.filter(item => item.variantId !== variantId));
  };
  
  const handlePurchase = () => {
    if (selectedItems.length === 0) {
      alert('상품 옵션을 선택해주세요.');
      return;
    }

    const itemsQuery = selectedItems
      .map(item => `${item.variantId}_${item.quantity}`)
      .join(',');

    navigate(`/user/order?productId=${productId}&items=${itemsQuery}`);
  };

  // ✅ 장바구니 담기
  const handleAddToCart = () => {
    if (selectedItems.length === 0) {
      alert('상품 옵션을 선택해주세요.');
      return;
    }

    const { product, variants } = productData;

    selectedItems.forEach(item => {
      const variant = variants.find(v => v.id === parseInt(item.variantId));
      if (!variant) return;

      const itemToAdd = {
        productId: product.id,
        variantId: variant.id,
        quantity: item.quantity,
        name: product.name,
        brand: product.brand,
        thumbnailUrl: product.thumbnailUrl,
        price: product.salePrice,
        addPrice: variant.addPrice,
        option1Value: variant.option1Value,
        option2Value: variant.option2Value,
      };
      addToCart(itemToAdd);
    });

    // ✅ 모달 열기
    setIsCartModalOpen(true);
  };

  if (loading) return <div>상품 정보를 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;
  if (!productData) return <div>상품 정보가 없습니다.</div>;

  const { product, variants } = productData;

  const totalPrice = selectedItems.reduce((total, currentItem) => {
    const variant = variants.find(v => v.id === parseInt(currentItem.variantId));
    const itemPrice = (product.salePrice + (variant?.addPrice || 0)) * currentItem.quantity;
    return total + itemPrice + deliverFee;
  }, 0);

  return (
    <div className='flex items-start'>
      {/* 왼쪽: 상품 이미지 및 상세 설명 */}
      <div className='w-3/4 ml-10'>
        <div className='flex flex-col items-center'>
          <h2 className='text-2xl font-bold my-4'>[{product.brand}] {product.name}</h2>
          <img src={TestImg} alt={product.name} className='my-5 w-[300px]'/>
        </div>

        <div 
          className={`w-full bg-gray-100 overflow-hidden transition-all duration-500 ease-in-out
            ${isDescriptionExpanded ? 'max-h-full' : 'max-h-96'}`}
        >
          <div dangerouslySetInnerHTML={{ __html: product.detailHtml }} />
        </div>

        <div className='flex justify-center my-4'>
          <Button 
            variant="signUp" 
            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            className='w-full'
          >
            {isDescriptionExpanded ? '접기' : '더보기'}
          </Button>
        </div>
      </div>

      {/* 오른쪽: 구매 옵션 패널 */}
      <aside className='sticky top-8 p-8 w-1/4 flex flex-col'>
        <div className='w-full'>
          <div>
            <span className='text-2xl text-[#23a4d3]'>{product.salePrice.toLocaleString()}원&ensp;</span>
            <span className='text-lg line-through text-gray-600'>{product.basePrice.toLocaleString()}원</span>
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
        <hr className="w-full border-t my-4 border-gray-200" />
        <div className='w-full mb-4'>
          <select onChange={handleOptionChange} defaultValue="" className='w-full p-2 border border-gray-300 rounded-md'>
            <option value="">선택해주세요.</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.stock === 0}>
                {`${v.option1Value} ${v.option2Value || ''}`}
                {v.addPrice > 0 ? ` (+${v.addPrice.toLocaleString()}원)` : ''}
                {v.stock === 0 ? ' (품절)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className='space-y-3 pr-2'>
          {selectedItems.map(item => {
            const variant = variants.find(v => v.id === parseInt(item.variantId));
            if (!variant) return null;
            const itemPrice = (product.salePrice + variant.addPrice) * item.quantity;

            return (
              <div key={item.variantId} className='bg-gray-100 p-3 rounded-md'>
                <div className='flex justify-between items-start'>
                  <p className='text-sm text-gray-700 max-w-[80%]'>{`${variant.option1Value} ${variant.option2Value || ''}`}</p>
                  <Icon src={Delete} alt="삭제" className='w-4 h-4 cursor-pointer' onClick={() => handleRemoveItem(item.variantId)} />
                </div>
                <div className='flex items-center justify-between mt-2'>
                  <div className='flex items-center justify-between p-1 border border-solid border-gray-300 rounded-md bg-white'>
                    <Icon src={Minus} alt='감소' onClick={() => handleQuantityChange(item.variantId, -1)} className='w-5 h-5 cursor-pointer' />
                    <span className='px-3 text-base font-semibold'>{item.quantity}</span>
                    <Icon src={Plus} alt='증가' onClick={() => handleQuantityChange(item.variantId, 1)} className='w-5 h-5 cursor-pointer' />
                  </div>
                  <span className='text-base font-bold'>{itemPrice.toLocaleString()}원</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className='pt-4'>
          {selectedItems.length > 0 && (
            <div className='flex justify-between items-center mb-4'>
              <span className='text-lg font-bold'>총 상품 금액</span>
              <span className='text-2xl font-bold'>{totalPrice.toLocaleString()}원</span>
            </div>
          )}
          <Button className='w-full mb-2' onClick={handlePurchase}>구매하기</Button>
          <div className='flex gap-2 w-full'>
            <Button variant='signUp' className='flex-1' onClick={handleAddToCart}>장바구니</Button>
            <Button variant='signUp' className='flex-1'>1:1 채팅하기</Button>
          </div>
        </div>
      </aside>

      {/* ✅ 공통 모달 추가 */}
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
        <p className="text-sm text-gray-700">
          선택한 상품이 장바구니에 담겼습니다.
        </p>
      </Modal>
    </div>
  );
};

export default ProductDetailPage;
