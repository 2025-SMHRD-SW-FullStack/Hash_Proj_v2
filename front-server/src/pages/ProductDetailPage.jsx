// src/pages/ProductDetailPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// 필요한 서비스 및 스토어 import
import { getProductDetail, adminDeleteProduct } from '../service/productService.js';
import { addCartItem } from '../service/cartService.js';
import { findOrCreateRoomByProduct } from '../service/chatService';
import useAuthStore from '../stores/authStore';
import { getProductFeedbacks } from '../service/feedbackService.js';

// 컴포넌트 및 아이콘 import
import Button from '../components/common/Button';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import Minus from '../assets/icons/ic_minus.svg';
import Plus from '../assets/icons/ic_plus.svg';
import Close from '../assets/icons/ic_close.svg';
import TestImg from '../assets/images/ReSsol_TestImg.png';
import FeedbackItem from '../components/common/product/FeedbackItem.jsx';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isAdmin } = useAuthStore(); // isAdmin 추가

  // --- 상품 정보 상태 ---
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const deliverFee = 3000;

  // --- 피드백 상태 ---
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(true);
  const [feedbackPage, setFeedbackPage] = useState(0);
  const [hasMoreFeedbacks, setHasMoreFeedbacks] = useState(true);

  // --- UI/모달 상태 ---
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [isFeedbackInfoModalOpen, setFeedbackInfoModalOpen] = useState(false);

  // --- 데이터 로딩 ---
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProductDetail(productId);
        setProductData(data);
      } catch (err) {
        setError(err.message || '상품 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    loadFeedbacks(0, true); // 첫 피드백 로드
  }, [productId]);

  const loadFeedbacks = async (page = 0, reset = false) => {
    if (feedbacksLoading && !reset) return;
    setFeedbacksLoading(true);
    try {
      const data = await getProductFeedbacks(productId, { page, size: 5 });
      setFeedbacks(prev => reset ? data.content : [...prev, ...data.content]);
      setHasMoreFeedbacks(!data.last);
      setFeedbackPage(page);
    } catch (err) {
      console.error("피드백 로딩 실패:", err);
    } finally {
      setFeedbacksLoading(false);
    }
  };
  
  // [추가] 상품 삭제 핸들러
  const handleProductDelete = async () => {
    if (window.confirm('이 상품을 정말 삭제하시겠습니까? 복구할 수 없습니다.')) {
      try {
        await adminDeleteProduct(productId);
        alert('상품이 삭제되었습니다.');
        navigate('/products'); // 상품 목록 페이지로 이동
      } catch (error) {
        alert('상품 삭제에 실패했습니다.');
        console.error(error);
      }
    }
  };

  const handleFeedbackDeleted = (deletedFeedbackId) => {
    setFeedbacks(prev => prev.filter(fb => fb.id !== deletedFeedbackId));
  };


  const handleOptionChange = (e) => {
    const selectedVariantId = e.target.value;
    if (!selectedVariantId) return;
    const isAlreadySelected = selectedItems.some(item => item.variantId === selectedVariantId);
    if (isAlreadySelected) {
      alert('이미 선택된 옵션입니다.');
      e.target.value = '';
      return;
    }
    setSelectedItems(prev => [...prev, { variantId: selectedVariantId, quantity: 1 }]);
    e.target.value = '';
  };
  
  const handleQuantityChange = (variantId, amount) => {
    setSelectedItems(prev =>
      prev.map(item =>
        item.variantId === variantId
          ? { ...item, quantity: Math.max(1, item.quantity + amount) }
          : item
      )
    );
  };
  
  const handleRemoveItem = (variantId) => {
    setSelectedItems(prev => prev.filter(item => item.variantId !== variantId));
  };
  
  const handlePurchase = () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (selectedItems.length === 0) {
      alert('상품 옵션을 선택해주세요.');
      return;
    }
    const itemsQuery = selectedItems.map(item => `${item.variantId}_${item.quantity}`).join(',');
    navigate(`/user/order?productId=${productId}&items=${itemsQuery}`);
  };
  
  const handleAddToCart = async () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!productData || selectedItems.length === 0) {
      alert('상품 옵션을 선택해주세요.');
      return;
    }
    const { product, variants } = productData;
    const labels = [product.option1Name, product.option2Name, product.option3Name, product.option4Name, product.option5Name];
  
    try {
      for (const item of selectedItems) {
        const variant = variants.find(v => v.id === parseInt(item.variantId));
        if (!variant) continue;
        const options = {};
        if (labels[0]) options[labels[0]] = variant.option1Value ?? null;
        if (labels[1]) options[labels[1]] = variant.option2Value ?? null;
        if (labels[2]) options[labels[2]] = variant.option3Value ?? null;
        if (labels[3]) options[labels[3]] = variant.option4Value ?? null;
        if (labels[4]) options[labels[4]] = variant.option5Value ?? null;
  
        await addCartItem({ productId: product.id, qty: item.quantity, options });
      }
      setIsCartModalOpen(true);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || '장바구니 담기 중 오류가 발생했습니다.';
      alert(msg);
    }
  };
  
  const handleOpenChat = async () => {
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!productData) return;
  
    try {
      setChatLoading(true);
      const room = await findOrCreateRoomByProduct(Number(productId));
      navigate(`/user/chat/rooms/${room.roomId}`);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || '채팅방 생성 중 오류가 발생했습니다.';
      alert(msg);
    } finally {
      setChatLoading(false);
    }
  };

  const handleWriteFeedback = () => {
    if (!isLoggedIn) {
        setIsAuthModalOpen(true);
        return;
    }
    setFeedbackInfoModalOpen(true);
  };

  if (loading) return <div>상품 정보를 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;
  if (!productData) return <div>상품 정보가 없습니다.</div>;

  const { product, variants } = productData;

  const totalPrice = selectedItems.reduce((total, currentItem) => {
    const variant = variants.find(v => v.id === parseInt(currentItem.variantId));
    const itemPrice = (product.salePrice + (variant?.addPrice || 0)) * currentItem.quantity;
    return total + itemPrice;
  }, 0) + (selectedItems.length > 0 ? deliverFee : 0);

  return (
    <div className='flex flex-col lg:flex-row items-start'>
      {/* 왼쪽 상세 내용 */}
      <div className='w-full lg:w-3/4 px-4 lg:px-10'>
        <div className='flex flex-col items-center'>
          <div className="w-full flex justify-between items-center my-4">
              <h2 className='text-2xl font-bold'>[{product.brand}] {product.name}</h2>
              {isAdmin && (
                  <Button variant="danger" size="sm" onClick={handleProductDelete}>
                      상품 삭제
                  </Button>
              )}
          </div>
          <img src={product.thumbnailUrl || TestImg} alt={product.name} className='my-5 w-full max-w-md rounded-lg shadow-md'/>
        </div>

        <div className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${isDescriptionExpanded ? 'max-h-full' : 'max-h-96'}`}>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.detailHtml }} />
        </div>

        <div className='my-4 flex justify-center'>
          <Button variant="signUp" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className='w-full'>
            {isDescriptionExpanded ? '상세 정보 접기' : '상세 정보 더보기'}
          </Button>
        </div>

        {/* 피드백 섹션 */}
        <hr className="my-8 border-t border-gray-300" />
        <div className="feedback-section">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold">피드백 모음 ({feedbacks.length})</h3>
            <Button variant="outline" onClick={handleWriteFeedback} className="font-semibold">
              피드백 작성하기 ✏️
            </Button>
          </div>
          <div className="space-y-6">
            {feedbacks.length > 0 ? (
              feedbacks.map((fb) => <FeedbackItem key={fb.id} feedback={fb} onFeedbackDeleted={handleFeedbackDeleted} />)
            ) : (
              <p className="text-gray-500 text-center py-8">아직 작성된 피드백이 없습니다.</p>
            )}
            {hasMoreFeedbacks && (
              <div className="text-center mt-4">
                <Button variant="blackWhite" onClick={() => loadFeedbacks(feedbackPage + 1)} disabled={feedbacksLoading}>
                  {feedbacksLoading ? '로딩 중...' : '피드백 더보기'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 오른쪽: 구매 옵션 패널 */}
      <aside className='sticky top-8 w-full lg:w-1/4 flex-shrink-0 p-4 lg:p-8'>
        <div className='border rounded-lg p-4 bg-white shadow-lg'>
          <div className='w-full'>
            <div>
              <span className='text-2xl text-[#5882F6] font-bold'>{product.salePrice.toLocaleString()}원&ensp;</span>
              <span className='text-lg text-gray-500 line-through'>{product.basePrice.toLocaleString()}원</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1 mt-2">
                <p>배송비: {deliverFee.toLocaleString()}원</p>
                <p>지급 포인트: {product.feedbackPoint.toLocaleString()}P</p>
                <p>모집 기간: ~{product.saleEndAt?.slice(0, 10)}</p>
            </div>
          </div>

          <hr className="my-4 w-full border-t border-gray-200" />

          <div className='mb-4 w-full'>
            <select onChange={handleOptionChange} defaultValue="" className='w-full rounded-md border border-gray-300 p-2'>
              <option value="">옵션을 선택해주세요.</option>
              {variants.map(v => (
                <option key={v.id} value={v.id} disabled={v.stock === 0}>
                  {`${v.option1Value ?? ''} ${v.option2Value ?? ''}`.trim()}
                  {v.addPrice > 0 ? ` (+${v.addPrice.toLocaleString()}원)` : ''}
                  {v.stock === 0 ? ' (품절)' : ` (재고: ${v.stock}개)`}
                </option>
              ))}
            </select>
          </div>

          <div className='space-y-3 pr-2 max-h-48 overflow-y-auto'>
            {selectedItems.map(item => {
              const variant = variants.find(v => v.id === parseInt(item.variantId));
              if (!variant) return null;
              const itemPrice = (product.salePrice + (variant.addPrice || 0)) * item.quantity;

              return (
                <div key={item.variantId} className='rounded-md bg-gray-100 p-3'>
                  <div className='flex items-start justify-between'>
                    <p className='max-w-[80%] text-sm text-gray-700'>{`${variant.option1Value ?? ''} ${variant.option2Value ?? ''}`.trim()}</p>
                    <Icon src={Close} alt="삭제" className='h-4 w-4 cursor-pointer' onClick={() => handleRemoveItem(item.variantId)} />
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
              );
            })}
          </div>

          <div className='pt-4'>
            {selectedItems.length > 0 && (
              <div className='mb-4 flex items-center justify-between'>
                <span className='text-lg font-bold'>총 상품 금액</span>
                <span className='text-2xl font-bold'>{totalPrice.toLocaleString()}원</span>
              </div>
            )}
            <Button className='mb-2 w-full h-12 text-lg' onClick={handlePurchase}>구매하기</Button>
            <div className='flex w-full gap-2'>
              <Button variant='signUp' className='flex-1' onClick={handleAddToCart}>장바구니</Button>
              <Button variant='signUp' className='flex-1' onClick={handleOpenChat} disabled={chatLoading}>
                {chatLoading ? '열고 있어요…' : '1:1 문의하기'}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <Modal isOpen={isCartModalOpen} onClose={() => setIsCartModalOpen(false)} title="🛒 장바구니 안내"
        footer={<><Button variant="signUp" onClick={() => setIsCartModalOpen(false)}>계속 쇼핑</Button><Button onClick={() => navigate('/user/mypage/cart')}>장바구니 가기</Button></>}>
        <p className="text-sm text-gray-700">선택한 상품이 장바구니에 담겼습니다.</p>
      </Modal>

      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title="회원 전용 서비스"
        footer={<><Button variant="signUp" onClick={() => navigate('/login', { state: { redirectTo: location.pathname } })}>로그인</Button><Button onClick={() => navigate('/email_signup')}>회원가입</Button></>}>
        <p className="text-base text-gray-700">로그인 후 이용해주세요.</p>
      </Modal>
      
      <Modal isOpen={isFeedbackInfoModalOpen} onClose={() => setFeedbackInfoModalOpen(false)} title="피드백 작성 안내"
          footer={<><Button variant="signUp" onClick={() => setFeedbackInfoModalOpen(false)}>닫기</Button><Button onClick={() => navigate('/user/mypage/orders')}>주문 내역 가기</Button></>}>
        <p className="text-base text-gray-700">피드백은 상품을 구매한 회원만 작성할 수 있습니다. '주문 내역'에서 작성할 상품을 선택해주세요.</p>
      </Modal>

    </div>
  );
};

export default ProductDetailPage;