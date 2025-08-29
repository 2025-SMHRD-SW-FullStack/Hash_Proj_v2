import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Minus from '../../../assets/icons/ic_minus.svg';
import Plus from '../../../assets/icons/ic_plus.svg';
import Delete from '../../../assets/icons/ic_delete.svg';
import useCartStore from '../../../stores/cartStore';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';

const SHIPPING_FEE = 3000;

const MyCartPage = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity } = useCartStore();
  const [selectedIds, setSelectedIds] = useState(new Set(items.map(it => it.variantId)));

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(items.map(it => it.variantId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (variantId) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(variantId)) {
      newSelectedIds.delete(variantId);
    } else {
      newSelectedIds.add(variantId);
    }
    setSelectedIds(newSelectedIds);
  };

  const selectedItems = useMemo(() => {
    return items.filter(item => selectedIds.has(item.variantId));
  }, [items, selectedIds]);

  const totals = useMemo(() => {
  const itemsPrice = selectedItems.reduce((sum, item) => sum + (item.price + item.addPrice) * item.quantity, 0);
  const shipping = selectedItems.reduce((sum, item) => sum + (item.shippingFee || SHIPPING_FEE), 0);
  return {
    itemsPrice,
    shipping,
    total: itemsPrice + shipping,
  };
}, [selectedItems]);

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      alert('주문할 상품을 선택해주세요.');
      return;
    }
    
    // 현재 주문 로직은 단일 상품 ID만 지원하므로, 여러 종류의 상품을 한번에 주문하는 것은 제한됩니다.
    const productId = selectedItems[0].productId;
    const itemsQuery = selectedItems
  .map(item => `${item.variantId}_${item.quantity}`)
  .join(',');
navigate(`/user/order?items=${itemsQuery}`);
  };


  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">장바구니</h2>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-500">장바구니가 비어있습니다.</div>
      ) : (
        <div className="border rounded-lg shadow-sm">
          <div className="flex items-center p-4 border-b">
            <input
              type="checkbox"
              id="selectAll"
              className="mr-4"
              checked={items.length > 0 && selectedIds.size === items.length}
              onChange={handleSelectAll}
            />
            <label htmlFor="selectAll">전체 선택</label>
          </div>

          {items.map(item => (
            <div key={item.variantId} className="flex items-center p-4 border-b">
              <input type="checkbox" className="mr-4" checked={selectedIds.has(item.variantId)} onChange={() => handleSelectItem(item.variantId)} />
              <img src={item.thumbnailUrl || 'https://via.placeholder.com/100'} alt={item.name} className="w-24 h-24 rounded-lg object-cover" />
              <div className="flex-grow ml-4">
                <p className="text-sm text-gray-500">{item.brand}</p>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-gray-600">옵션: {item.option1Value} {item.option2Value || ''}</p>
              </div>
              <div className="flex items-center justify-between p-1 border border-solid border-gray-300 rounded-md bg-white w-28">
                <Icon src={Minus} alt='감소' onClick={() => updateQuantity(item.variantId, item.quantity - 1)} className='w-5 h-5 cursor-pointer' />
                <span className='px-3 text-base font-semibold'>{item.quantity}</span>
                <Icon src={Plus} alt='증가' onClick={() => updateQuantity(item.variantId, item.quantity + 1)} className='w-5 h-5 cursor-pointer' />
              </div>
              <div className="w-40 text-right font-bold text-lg">
                {((item.price + item.addPrice) * item.quantity).toLocaleString()}원
              </div>
              <div className="w-16 text-center">
                <Icon src={Delete} alt="삭제" className='w-5 h-5 cursor-pointer inline' onClick={() => removeFromCart(item.variantId)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-between items-center bg-gray-50 p-6 rounded-lg">
        <div>
          <p>총 선택 상품 금액: {totals.itemsPrice.toLocaleString()}원</p>
          <p>총 배송비: {totals.shipping.toLocaleString()}원</p>
          <p className="text-xl font-bold mt-2">총 주문 금액: {totals.total.toLocaleString()}원</p>
        </div>
        <Button size="lg" className="w-56 text-xl" onClick={handleCheckout}>
          주문하기
        </Button>
      </div>
    </div>
  );
};

export default MyCartPage;