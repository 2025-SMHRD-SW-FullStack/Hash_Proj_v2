import { useNavigate } from 'react-router-dom';

/**
 * 상품 페이지 이동 로직을 처리하는 Custom Hook
 * @returns {function(productId): void} 상품 상세 페이지로 이동하는 함수
 */
export const useProductDetail = () => {
  const navigate = useNavigate();

  // 상품 ID를 받아서 해당 상세 페이지로 이동시키는 함수
  const goToProductDetail = (productId) => {
    // productId가 유효한 경우에만 페이지 이동
    if (productId) {
      navigate(`/product/${productId}`);
    } else {
      // 만약을 대비한 에러 처리
      console.error("이동할 상품의 ID가 없습니다.");
    }
  };

  // 이 훅을 사용하는 컴포넌트에게 goToProductDetail 함수를 반환해줍니다.
  return goToProductDetail;
};