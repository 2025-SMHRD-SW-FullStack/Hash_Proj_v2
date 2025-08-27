import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProductDetail } from '../service/productService'; 
import Button from '../components/common/Button';

const OrderPage = () => {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId');
  const itemsQuery = searchParams.get('items');

  const [orderItems, setOrderItems] = useState([]);
  const [productInfo, setProductInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const deliverFee = 3000;

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!productId || !itemsQuery) {
        setError('주문 정보가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // 1. productId로 상품 기본 정보를 가져옵니다.
        const productData = await getProductDetail(productId);
        setProductInfo(productData.product);

        // 2. itemsQuery를 파싱하여 주문 목록을 만듭니다.
        const parsedItems = itemsQuery.split(',').map(itemStr => {
          const [variantId, quantity] = itemStr.split('_');
          const variant = productData.variants.find(v => v.id === parseInt(variantId));
          if (variant) {
            return {
              variant,
              quantity: parseInt(quantity),
            };
          }
          return null;
        }).filter(Boolean); // null인 항목은 제외합니다.

        if (parsedItems.length === 0) {
          throw new Error('선택한 옵션을 찾을 수 없습니다.');
        }
        
        setOrderItems(parsedItems);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderData();

  }, [productId, itemsQuery]);

  if (loading) return <div>주문 정보를 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;
  if (orderItems.length === 0 || !productInfo) return <div>주문 상품 정보가 없습니다.</div>;
  
  // 총 주문 금액 계산
  const totalAmount = orderItems.reduce((total, item) => {
      const itemPrice = (productInfo.salePrice + item.variant.addPrice) * item.quantity;
      return total + itemPrice + deliverFee;
  }, 0)

  return (
    <div className='max-x-7xl'>
      <h1>주문/결제</h1>
      <div>
        <h2>주문 상품 정보</h2>
        <img src='productInfo.thumbnailUrl' alt="상품 썸네일" />
        <p><strong>상품명:</strong> {productInfo.name}</p>
        <hr/>
        {orderItems.map(item => (
            <div key={item.variant.id}>
                <p>선택 옵션: {item.variant.option1Value} {item.variant.option2Value && `/ ${item.variant.option2Value}`}</p>
                <p>수량: {item.quantity}개</p>
                <p>가격: {((productInfo.salePrice + item.variant.addPrice) * item.quantity).toLocaleString()}원</p>
                <p>배송비: {deliverFee.toLocaleString()}원</p>
                <hr/>
            </div>
        ))}

        <h3>총 주문 금액: {totalAmount.toLocaleString()}원</h3>
      </div>
      
      {/* ✅ 이 곳에 배송지 정보를 표시하는 UI를 추가할 수 있습니다.
        zustand 스토어의 user 상태를 가져와서 사용자의 주소 등을 표시하면 됩니다.
        
        예시:
        const { user } = useAuthStore();
        ...
        <div>
          <h2>배송지 정보</h2>
          <p>이름: {user.name}</p>
          <p>연락처: {user.phoneNumber}</p>
          <p>주소: {user.address}</p>
        </div>
      */}

      <footer>
        <Button>구매하기</Button>
      </footer>
    </div>
  );
};

export default OrderPage;