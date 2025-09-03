import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Button from "../../../components/common/Button";
import { confirmTossPayment } from "../../../service/paymentService"
import { getMyOrderDetail } from "../../../service/orderService";
import TestImg from '../../../assets/images/ReSsol_TestImg.png'; // 임시 상품 이미지
// import { getOverallAdSamples } from '../../../service/adsService'; // [광고] 1. 광고 서비스 import
// import { getProducts } from "../../../service/productService"; // [광고] 2. 상품 서비스 import

// 체크 아이콘 SVG
const CheckCircleIcon = () => (
  <svg className="w-12 h-12 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// 엑스 아이콘 SVG
const ExclamationCircleIcon = () => (
    <svg className="w-12 h-12 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const OrderCompletePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("processing"); // 'processing', 'success', 'fail'
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // const [adProducts, setAdProducts] = useState([]); // [광고] 3. 광고 상품 상태

  useEffect(() => {
    const isSuccess = searchParams.get('status') === 'success';
    const tossOrderId = searchParams.get('orderId'); // Toss가 보내준 주문 UID
    const paymentKey = searchParams.get('paymentKey');
    const amount = searchParams.get('amount');

    const processOrder = async () => {
      if (!tossOrderId || !paymentKey || !amount) {
        console.log('결제 정보가 올바르지 않습니다.');
        setStatus('fail');
        setError('결제 정보가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      try {
        // 1. Toss 결제 최종 승인 API 호출 (0원 결제 포함)
        // ✅ [수정] 0원 결제 시에도 재고 차감이 제대로 되도록 confirmTossPayment 호출
        console.log('결제 승인 요청:', { paymentKey, orderId: tossOrderId, amount: Number(amount) });
        const confirmResponse = await confirmTossPayment({
            paymentKey,
            orderId: tossOrderId, // 여기서는 UID를 보내는 것이 맞습니다.
            amount: Number(amount),
        });
        console.log('결제 승인 응답:', confirmResponse);

        // ✅ [수정] 응답 객체에서 백엔드가 보내주는 실제 숫자 ID를 추출합니다.
        // (TossConfirmResponse DTO에서 'orderDbId'로 되어있습니다)
        const dbOrderId = confirmResponse?.orderDbId;
        console.log('추출된 주문 ID:', { dbOrderId, fallbackId: confirmResponse?.orderId });
        
        if (!dbOrderId) {
            // 호환성을 위해 orderId 필드도 확인 (하지만 이는 UID일 가능성이 높음)
            const fallbackId = confirmResponse?.orderId;
            if(!fallbackId || typeof fallbackId !== 'number') {
                throw new Error("서버로부터 주문 ID를 받지 못했습니다.");
            }
        }

        // 2. 최종 승인이 성공하면, 받은 '숫자 ID'로 주문 상세 정보를 가져옵니다.
        // ✅ [수정] 0원 결제 시에도 재고 차감 후 주문 정보를 가져옵니다.
        const finalOrderId = dbOrderId || confirmResponse.orderId;
        console.log('최종 사용할 주문 ID:', finalOrderId);
        
        // ✅ [개선] 주문 정보를 여러 번 시도하여 상태 업데이트를 확인
        let orderDetails = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            try {
                orderDetails = await getMyOrderDetail(finalOrderId);
                console.log(`주문 정보 조회 시도 ${retryCount + 1}:`, orderDetails);
                
                // 주문 상태가 READY로 변경되었는지 확인
                if (orderDetails && orderDetails.status === 'READY') {
                    console.log('주문 상태가 READY로 정상 변경되었습니다.');
                    break;
                } else if (orderDetails) {
                    console.log(`주문 상태가 아직 ${orderDetails.status}입니다. 재시도 중...`);
                    // 잠시 대기 후 재시도
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    retryCount++;
                } else {
                    console.error('주문 정보를 가져올 수 없습니다.');
                    break;
                }
            } catch (error) {
                console.error(`주문 정보 조회 실패 (시도 ${retryCount + 1}):`, error);
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        if (orderDetails) {
            setOrder(orderDetails);
            console.log('최종 주문 정보 설정 완료:', orderDetails);
        } else {
            throw new Error('주문 정보를 가져올 수 없습니다.');
        }
        
        setStatus('success');
      } catch (err) {
        setStatus('fail');
        setError(err?.response?.data?.message || err.message || '주문 처리 중 오류가 발생했습니다.');
        console.error("주문 처리 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    if (isSuccess) {
      processOrder();
    } else {
      setStatus('fail');
      setError(searchParams.get('message') || '결제에 실패했습니다.');
      setLoading(false);
    }
  }, [searchParams]);


  if (loading) {
    return <div className="text-center p-10">주문 처리 중입니다...</div>;
  }

  if (status === 'fail') {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <ExclamationCircleIcon />
        <h1 className="text-2xl font-bold mt-4 mb-4">결제에 실패했습니다</h1>
        <p className="text-red-600 bg-red-50 p-4 rounded-lg mb-8">{error}</p>
        <div className="flex gap-4">
            <Button variant="blackWhite" className="flex-1" onClick={() => navigate('/')}>홈으로</Button>
            <Button className="flex-1" onClick={() => navigate(-1)}>다시 결제하기</Button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const representativeItem = order.items && order.items[0];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-8">
      <div className="text-center mb-8">
        <CheckCircleIcon />
        <h1 className="text-2xl sm:text-3xl font-bold mt-4">주문이 완료되었습니다!</h1>
      </div>

      <div className="border rounded-xl p-6 space-y-6 bg-white shadow-sm">
        {/* 주문 번호 */}
        <div>
          <span className="font-semibold text-lg">주문 번호</span>
          <p className="text-gray-700 mt-1">{order.orderUid}</p>
        </div>
        
        {/* ✅ [추가] 주문 상태 표시 */}
        <div>
          <span className="font-semibold text-lg">주문 상태</span>
          <div className="mt-1">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              order.status === 'READY' 
                ? 'bg-green-100 text-green-800' 
                : order.status === 'PENDING' 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {order.status === 'READY' ? '배송 준비중' : 
               order.status === 'PENDING' ? '결제 대기' : 
               order.status === 'PAID' ? '결제 완료' : 
               order.status}
            </span>
          </div>
        </div>
        
        <hr />

        {/* 배송지 정보 */}
        <div>
          <h3 className="font-semibold text-lg mb-2">배송지 정보</h3>
          <div className="text-sm text-gray-800 space-y-1">
            <p><strong>받는 분:</strong> {order.receiver}</p>
            <p><strong>연락처:</strong> {order.phone}</p>
            <p><strong>주소:</strong> ({order.zipcode}) {order.addr1} {order.addr2}</p>
            {order.requestMemo && <p><strong>배송 메모:</strong> {order.requestMemo}</p>}
          </div>
        </div>

        <hr />

        {/* 상품 요약 */}
        <div>
          <h3 className="font-semibold text-lg mb-3">주문 상품</h3>
          <div className="flex gap-4">
            <img 
              src={TestImg} // 실제로는 representativeItem.thumbnailUrl 등을 사용
              alt={representativeItem?.productNameSnapshot}
              className="w-24 h-24 rounded-lg object-cover bg-gray-100"
            />
            <div className="flex flex-col justify-center">
              <p className="font-semibold">{representativeItem?.productNameSnapshot}</p>
              {order.items.length > 1 && (
                <p className="text-sm text-gray-500">외 {order.items.length - 1}건</p>
              )}
              <p className="text-xs text-gray-500 mt-1">배송 소요일 3일 (예상)</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full mt-4" 
            onClick={() => navigate(`/user/mypage/orders/${order.id}`)}
          >
            주문 상세보기
          </Button>
        </div>
      </div>
      
      {/* 하단 버튼 */}
      <div className="flex gap-4 mt-8">
        <Button variant="blackWhite" className="flex-1" onClick={() => navigate('/')}>홈으로</Button>
        <Button className="flex-1" onClick={() => navigate('/user/mypage/orders')}>주문 내역 보기</Button>
      </div>

      {/* [광고] 5. 추천 상품 섹션 (주석 해제하여 사용) */}
      {/* <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">이 상품도 살펴보세요!</h2>
        {adProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {adProducts.map(product => (
              <Product key={product.id} product={product} onClick={() => navigate(`/product/${product.id}`)} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">추천 상품을 불러오는 중입니다.</p>
        )}
      </div>
      */}
    </div>
  );
};

export default OrderCompletePage;