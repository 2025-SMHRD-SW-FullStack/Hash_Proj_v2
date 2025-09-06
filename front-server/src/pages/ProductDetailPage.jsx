// src/pages/ProductDetailPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// --- 서비스 및 스토어 ---
import { getProductDetail, adminDeleteProduct } from '../service/productService.js';
import { addCartItem } from '../service/cartService.js';
import { findOrCreateRoomByProduct } from '../service/chatService';
import useAuthStore from '../stores/authStore';
import { getProductFeedbacks } from '../service/feedbackService.js';

// --- 컴포넌트 및 아이콘 ---
import Button from '../components/common/Button';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import Minus from '../assets/icons/ic_minus.svg';
import Plus from '../assets/icons/ic_plus.svg';
import Close from '../assets/icons/ic_close.svg';
import TestImg from '../assets/images/ReSsol_TestImg.png';
import FeedbackItem from '../components/product/FeedbackItem.jsx';
import CategorySelect from '../components/common/CategorySelect.jsx';

const ProductDetailPage = () => {
  const { productId: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, isAdmin } = useAuthStore();

  // --- 상태 관리 ---
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  // 라우트 파라미터(or 로딩된 데이터)에서 안전한 pid 보장
  const pid = useMemo(() => Number(paramId || productData?.product?.id || 0), [paramId, productData]);


  // 배송비 (무형자산 0원)
  const deliverFee = useMemo(() => {
    if (productData?.product?.category === '무형자산') return 0;
    return 3000;
  }, [productData]);

  // ✅ 총 재고 계산: product.stockTotal 우선, 없으면 variants[].stock 합
  const totalStock = useMemo(() => {
    if (!productData) return 0;
    const { product, variants } = productData;
    if (product?.stockTotal != null) return product.stockTotal;
    return Array.isArray(variants)
      ? variants.reduce((sum, v) => sum + (v?.stock ?? 0), 0)
      : 0;
  }, [productData]);

  // ✅ 선택된 옵션 중 품절(재고 0 이하) 포함 여부
  const hasAnySelectedSoldOut = useMemo(() => {
    if (!productData || !Array.isArray(selectedItems) || selectedItems.length === 0) return false;
    const { variants } = productData;
    return selectedItems.some(item => {
      const v = variants.find(v => v.id === parseInt(item.variantId));
      return (v?.stock ?? 0) <= 0;
    });
  }, [productData, selectedItems]);

  // ✅ 전체 품절 여부
  const isSoldOut = useMemo(() => (totalStock ?? 0) <= 0, [totalStock]);

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
  const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(false);

  // 옵션 사용 여부
  const useOptions = useMemo(() => {
    if (!productData) return false;
    const { product, variants } = productData;
    return !!product.option1Name && Array.isArray(variants) && variants.length > 0;
  }, [productData]);

  // 총 금액
  const totalPrice = useMemo(() => {
    if (!productData || selectedItems.length === 0) return 0;
    const { product } = productData;
    const unit =
      (product?.salePrice ?? 0) > 0 ? (product.salePrice ?? 0) : (product?.basePrice ?? 0);

    const itemsTotal = selectedItems.reduce((sum, it) => {
      const variant = productData.variants.find(v => v.id === Number(it.variantId));
      const add = variant?.addPrice ?? 0;
      const qty = it?.quantity ?? 1;
      return sum + (unit + add) * qty;
    }, 0);

    return itemsTotal + deliverFee; // 항목이 있으면 배송비 포함
  }, [selectedItems, productData, deliverFee]);

  // --- 데이터 로딩 ---
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProductDetail(paramId);
        setProductData(data);
      } catch (err) {
        setError(err.message || '상품 정보를 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [paramId]);

  // pid 확정되면 피드백 로드 (잘못된 /products/?page… 방지)
  useEffect(() => {
    if (pid) loadFeedbacks(0, true);
  }, [pid]);

  // 단일상품일 때 기본 선택
  useEffect(() => {
    if (!useOptions && productData && selectedItems.length === 0) {
      setSelectedItems([{
        variantId: String(productData.variants[0].id),
        quantity: 1
      }]);
    }
  }, [useOptions, productData, selectedItems]);

  const loadFeedbacks = async (page = 0, reset = false) => {
    if (feedbacksLoading && !reset) return;
    setFeedbacksLoading(true);
    try {
      const data = await getProductFeedbacks(pid, { page, size: 5 });
      setFeedbacks(prev => reset ? data.content : [...prev, ...data.content]);
      setHasMoreFeedbacks(!data.last);
      setFeedbackPage(page);
    } catch (err) {
      console.error('피드백 로딩 실패:', err);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  // --- 이벤트 핸들러 ---
  const handleProductDelete = async () => {
    if (window.confirm('이 상품을 정말 삭제하시겠습니까? 복구할 수 없습니다.')) {
      try {
        await adminDeleteProduct(pid);
        alert('상품이 삭제되었습니다.');
        navigate('/products');
      } catch (error) {
        alert('상품 삭제에 실패했습니다.');
        console.error(error);
      }
    }
  };

  const handleFeedbackDeleted = (deletedFeedbackId) => {
    setFeedbacks(prev => prev.filter(fb => fb.id !== deletedFeedbackId));
  };

  const handlePurchase = () => {
    if (isSoldOut || hasAnySelectedSoldOut) return; // ✅ 품절 차단
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (useOptions && selectedItems.length === 0) {
      alert('옵션을 선택해주세요.');
      return;
    }
    if (selectedItems.length === 0) {
      alert('상품 정보를 불러오는 중입니다.');
      return;
    }
    const itemsQuery = selectedItems.map(item => `${item.variantId}_${item.quantity}`).join(',');
    navigate(`/user/order?productId=${pid}&items=${itemsQuery}`);
  };

  const handleAddToCart = async () => {
    if (isSoldOut || hasAnySelectedSoldOut) return; // ✅ 품절 차단
    if (!isLoggedIn) {
      setIsAuthModalOpen(true);
      return;
    }
    if (useOptions && selectedItems.length === 0) {
      alert('옵션을 선택해주세요.');
      return;
    }
    if (selectedItems.length === 0) {
      alert('상품 정보를 불러오는 중입니다.');
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
      const room = await findOrCreateRoomByProduct(pid);
      const p = productData?.product ?? {};
      // 제품 요약정보를 state로 전달 → 채팅 헤더에서 즉시 표시
      navigate(`/user/chat/rooms/${room.roomId}`, {
        state: {
          product: {
            id: pid,
            name: p.name,
            imageUrl: p.thumbnailUrl
          }
        }
      });
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

  // --- 구매 옵션 패널 컴포넌트 ---
  const PurchaseOptionsPanel = () => {
    if (!productData) return null;
    const { product, variants } = productData;

    const optionCategories = useMemo(() => {
      return variants.map(v => ({
        value: v.id,
        label:
          `${v.option1Value ?? ''} ${v.option2Value ?? ''}`.trim() +
          (v.addPrice > 0 ? ` (+${v.addPrice.toLocaleString()}원)` : '') +
          (v.stock === 0 ? ' (품절)' : ` (재고: ${v.stock}개)`),
        disabled: v.stock === 0,
      }));
    }, [variants]);

    const placeholderOption = { value: '', label: '옵션을 선택해주세요.' };

    const handleOptionChange = (selectedOption) => {
      const selectedVariantId = selectedOption?.value;
      if (!selectedVariantId) return;

      const isAlreadySelected = selectedItems.some(item => item.variantId === String(selectedVariantId));
      if (isAlreadySelected) {
        alert('이미 선택된 옵션입니다.');
        return;
      }
      setSelectedItems(prev => [...prev, { variantId: String(selectedVariantId), quantity: 1 }]);
    };

    const handleQuantityInputChange = (variantId, value) => {
      const quantity = parseInt(value, 10);
      setSelectedItems(prev =>
        prev.map(item =>
          item.variantId === variantId ? { ...item, quantity: isNaN(quantity) || quantity < 1 ? 1 : quantity } : item
        )
      );
    };

    const handleQuantityChange = (variantId, amount) => {
      setSelectedItems(prev =>
        prev.map(item =>
          item.variantId === variantId
            ? { ...item, quantity: Math.max(1, item.quantity + amount) }
            : item
        ).filter(item => item.quantity > 0)
      );
    };

    const handleRemoveItem = variantId => {
      setSelectedItems(prev => prev.filter(item => item.variantId !== variantId));
    };

    return (
      <div className="p-4 bg-white flex-1 flex flex-col">
        <div>
          {product.salePrice > 0 ? (
            <>
              <span className="text-2xl text-primary font-bold">{product.salePrice.toLocaleString()}원&ensp;</span>
              <span className="text-lg text-gray-500 line-through">{product.basePrice.toLocaleString()}원</span>
            </>
          ) : (
            <span className="text-2xl text-primary font-bold">{product.basePrice.toLocaleString()}원</span>
          )}
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>배송비: {deliverFee > 0 ? `${deliverFee.toLocaleString()}원` : '무료'}</p>
            <p>지급 포인트: {product.feedbackPoint.toLocaleString()}P</p>
            <p>모집 기간: ~{product.saleEndAt?.slice(0, 10)}</p>
          </div>
        </div>

        <hr className="my-4 border-t border-gray-200" />

        <div className="pr-1 space-y-3">
          {useOptions && (
            <div className="mb-4">
              <CategorySelect
                categories={optionCategories}
                selected={placeholderOption}
                onChange={handleOptionChange}
              />
            </div>
          )}

          {selectedItems.map(item => {
            const variant = variants.find(v => v.id === parseInt(item.variantId));
            if (!variant) return null;
            const itemPrice = (product.salePrice > 0 ? product.salePrice : product.basePrice) + (variant.addPrice || 0);
            const totalItemPrice = itemPrice * item.quantity;

            return (
              <div key={item.variantId} className="rounded-md bg-gray-100 p-3">
                <div className="flex items-start justify-between">
                  <p className="max-w-[80%] text-sm text-gray-700">
                    {`${variant.option1Value ?? ''} ${variant.option2Value ?? ''}`.trim() || product.name}
                  </p>
                  {useOptions && (
                    <Icon
                      src={Close}
                      alt="삭제"
                      className="h-4 w-4 cursor-pointer"
                      onClick={() => handleRemoveItem(item.variantId)}
                    />
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center justify-between rounded-md border border-solid border-gray-300 bg-white">
                    <Icon
                      src={Minus}
                      alt="감소"
                      onClick={() => handleQuantityChange(item.variantId, -1)}
                      className="h-full w-6 p-1 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value > 0) {
                          setSelectedItems(prev =>
                            prev.map(si =>
                              si.variantId === item.variantId ? { ...si, quantity: value } : si
                            )
                          );
                        }
                      }}
                      className="w-14 text-center text-base font-semibold border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                    <Icon
                      src={Plus}
                      alt="증가"
                      onClick={() => handleQuantityChange(item.variantId, 1)}
                      className="h-full w-6 p-1 cursor-pointer"
                    />
                  </div>
                  <span className="text-base font-bold">{totalItemPrice.toLocaleString()}원</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-gray-200 mt-auto">
          {selectedItems.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">총 상품 금액</span>
              <span className="text-2xl font-bold text-primary">{totalPrice.toLocaleString()}원</span>
            </div>
          )}
          {/* ✅ 품절이면 라벨 '품절', 비활성화 */}
          <Button
            className="mb-2 w-full h-12 text-lg"
            onClick={handlePurchase}
            disabled={isSoldOut || hasAnySelectedSoldOut}
            aria-disabled={isSoldOut || hasAnySelectedSoldOut}
            title={(isSoldOut || hasAnySelectedSoldOut) ? '품절 상품은 구매할 수 없습니다' : '구매하기'}
          >
            {(isSoldOut || hasAnySelectedSoldOut) ? '품절' : '구매하기'}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="signUp"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={isSoldOut || hasAnySelectedSoldOut}
              aria-disabled={isSoldOut || hasAnySelectedSoldOut}
              title={(isSoldOut || hasAnySelectedSoldOut) ? '품절 상품은 장바구니에 담을 수 없습니다' : '장바구니'}
            >
              장바구니
            </Button>
            <Button variant="signUp" className="flex-1" onClick={handleOpenChat} disabled={chatLoading}>
              {chatLoading ? '열고 있어요…' : '1:1 문의하기'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div>상품 정보를 불러오는 중...</div>;
  if (error) return <div>오류: {error}</div>;
  if (!productData) return <div>상품 정보가 없습니다.</div>;

  const { product } = productData;

  return (
    <div className="pb-24 lg:pb-0">
      <div className="flex flex-col px-4 lg:flex-row items-start">
        <div className="w-full lg:w-3/4 lg:px-10">
          <div className="flex flex-col items-center">
            <div className="w-full flex justify-between items-center my-4">
              <h2 className="text-xl sm:text-2xl font-bold">[{product.brand}] {product.name}</h2>
              {isAdmin && (
                <Button variant="danger" size="sm" onClick={handleProductDelete}>
                  상품 삭제
                </Button>
              )}
            </div>
            <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-[500px] aspect-square rounded-lg overflow-hidden shadow-md my-5 mx-auto">
              <img
                src={product.thumbnailUrl || TestImg}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={e => {
                  e.target.onerror = null;
                  e.target.src = TestImg;
                }}
              />
            </div>
          </div>

          <div
            className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${isDescriptionExpanded ? 'max-h-full' : 'max-h-96'
              }`}
          >
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: product.detailHtml }} />
          </div>

          <div className="my-4 flex justify-center">
            <Button
              variant="signUp"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="w-full"
            >
              {isDescriptionExpanded ? '상세 정보 접기' : '상세 정보 더보기'}
            </Button>
          </div>

          <hr className="my-8 border-t border-gray-300" />
          <div className="feedback-section">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">피드백 모음 ({feedbacks.length})</h3>
              <Button variant="outline" onClick={handleWriteFeedback} className="font-semibold">
                피드백 작성하기 ✏️
              </Button>
            </div>
            <div className="space-y-6">
              {feedbacks.length > 0 ? (
                feedbacks.map(fb => (
                  <FeedbackItem key={fb.id} feedback={fb} onFeedbackDeleted={handleFeedbackDeleted} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">아직 작성된 피드백이 없습니다.</p>
              )}
              {hasMoreFeedbacks && (
                <div className="text-center mt-4">
                  <Button
                    variant="blackWhite"
                    onClick={() => loadFeedbacks(feedbackPage + 1)}
                    disabled={feedbacksLoading}
                  >
                    {feedbacksLoading ? '로딩 중...' : '피드백 더보기'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="hidden lg:block sticky top-8 w-full lg:w-1/4 h-[calc(100vh-4rem)] flex-shrink-0 p-4 lg:p-8">
          <PurchaseOptionsPanel />
        </aside>
      </div>

      {/* ✅ 모바일 하단바: 품절 시 라벨/비활성화 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white p-3 border-t shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-40 flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleAddToCart}
          disabled={isSoldOut || hasAnySelectedSoldOut}
          aria-disabled={isSoldOut || hasAnySelectedSoldOut}
          title={(isSoldOut || hasAnySelectedSoldOut) ? '품절 상품은 장바구니에 담을 수 없습니다' : '장바구니'}
        >
          장바구니
        </Button>
        <Button
          className="flex-1"
          onClick={
            (isSoldOut || hasAnySelectedSoldOut)
              ? undefined
              : (useOptions ? () => setIsOptionsPanelOpen(true) : handlePurchase)
          }
          disabled={isSoldOut || hasAnySelectedSoldOut}
          aria-disabled={isSoldOut || hasAnySelectedSoldOut}
          title={(isSoldOut || hasAnySelectedSoldOut) ? '품절 상품은 구매할 수 없습니다' : '구매하기'}
        >
          {(isSoldOut || hasAnySelectedSoldOut) ? '품절' : '구매하기'}
        </Button>
      </div>

      <Modal
        isOpen={isOptionsPanelOpen}
        onClose={() => setIsOptionsPanelOpen(false)}
        title="옵션 선택"
      >
        <div className="max-h-[70vh]">
          <PurchaseOptionsPanel />
        </div>
      </Modal>

      <Modal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        title="🛒 장바구니 안내"
        footer={
          <>
            <Button variant="signUp" onClick={() => setIsCartModalOpen(false)}>
              계속 쇼핑
            </Button>
            <Button onClick={() => navigate('/user/mypage/cart')}>장바구니 가기</Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">선택한 상품이 장바구니에 담겼습니다.</p>
      </Modal>

      <Modal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="회원 전용 서비스"
        footer={
          <>
            <Button
              variant="signUp"
              onClick={() =>
                navigate('/login', { state: { redirectTo: location.pathname } })
              }
            >
              로그인
            </Button>
            <Button onClick={() => navigate('/email_signup')}>회원가입</Button>
          </>
        }
      >
        <p className="text-base text-gray-700">로그인 후 이용해주세요.</p>
      </Modal>

      <Modal
        isOpen={isFeedbackInfoModalOpen}
        onClose={() => setFeedbackInfoModalOpen(false)}
        title="피드백 작성 안내"
        footer={
          <>
            <Button variant="signUp" onClick={() => setFeedbackInfoModalOpen(false)}>
              닫기
            </Button>
            <Button onClick={() => navigate('/user/mypage/orders')}>주문 내역 가기</Button>
          </>
        }
      >
        <p className="text-base text-gray-700">
          피드백은 상품을 구매한 회원만 작성할 수 있습니다. '주문 내역'에서 작성할 상품을 선택해주세요.
        </p>
      </Modal>
    </div>
  );
};

export default ProductDetailPage;
