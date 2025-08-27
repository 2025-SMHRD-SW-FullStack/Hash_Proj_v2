import axiosInstance from '../config/axiosInstance';
import { products, findProductById } from '../data/TestProducts'; // 가데이터 import 방식 변경

/**
 * ✅ [신규] 상품 목록 전체를 가져오는 API 함수
 * @returns {Promise<Array>} 상품 목록 배열
 */
export const getProducts = async () => {
  console.log('API 요청: 모든 상품 목록을 가져옵니다.');

  // --- 💡 지금은 가데이터를 사용 ---
  return new Promise((resolve) => {
    setTimeout(() => {
      // 실제 API는 product 객체만 배열로 내려줄 가능성이 높습니다.
      // 가데이터를 실제 API 응답과 유사하게 가공해줍니다.
      const productList = products.map(p => p.product);
      resolve(productList);
    }, 300);
  });

  /*
  // --- 🚀 나중에 실제 API로 교체할 코드 ---
  try {
    const response = await axiosInstance.get('/api/products');
    return response.data; // 서버가 내려주는 상품 목록 배열
  } catch (error) {
    console.error("상품 목록 API 연동 실패:", error);
    throw error;
  }
  */
};

/**
 * 상품 상세 정보를 가져오는 API 함수
 * @param {string | number} productId - 상품의 고유 ID
 * @returns {Promise<object>} { product, variants } 형태의 상품 상세 정보 객체
 */
export const getProductDetail = async (productId) => {
  console.log(`API 요청: ${productId}번 상품 정보를 가져옵니다.`);

  // --- 💡 지금은 가데이터를 사용 ---
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const productData = findProductById(productId);
      if (productData) {
        resolve(productData);
      } else {
        reject(new Error('상품을 찾을 수 없습니다.'));
      }
    }, 500);
  });

  /*
  // --- 🚀 나중에 실제 API로 교체할 코드 ---
  try {
    // 실제 API 경로로 수정
    const response = await axiosInstance.get(`/api/products/${productId}`);
    return response.data;
  } catch (error) {
    console.error("상품 상세 정보 API 연동 실패:", error);
    throw error;
  }
  */
};