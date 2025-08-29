// /src/data/products.mock.js
// 프로젝트에서 공통으로 쓰는 상품 더모 데이터

export const productsMock = [
  // 전자제품
  { id: 1,  category: '전자제품', name: '무선 미니 선풍기',   sku: 'WF-01', status: '판매중', price: 39000, stock: 28, updatedAt: '2025-08-20', saleEndAt: '2025-09-30' },
  { id: 2,  category: '전자제품', name: '휴대용 제습기',     sku: 'DH-11', status: '판매중', price: 59000, stock: 12, updatedAt: '2025-08-19', saleEndAt: '2025-08-15' }, // 마감 지남
  { id: 3,  category: '전자제품', name: '자외선 살균 케이스', sku: 'UV-05', status: '품절',   price: 42000, stock: 0,  updatedAt: '2025-08-18', saleEndAt: '2025-08-18' },
  { id: 4,  category: '전자제품', name: '스마트 온도계',       sku: 'TM-02', status: '판매중', price: 29000, stock: 44, updatedAt: '2025-08-17', saleEndAt: '2025-10-01' },
  { id: 5,  category: '전자제품', name: '블루투스 이어버드',   sku: 'BE-30', status: '판매중', price: 79000, stock: 8,  updatedAt: '2025-08-16', saleEndAt: '2025-09-05' },
  { id: 6,  category: '전자제품', name: 'USB 미니 가습기',     sku: 'HU-07', status: '판매중', price: 25000, stock: 61, updatedAt: '2025-08-15', saleEndAt: '2025-12-31' },
  { id: 7,  category: '전자제품', name: '스마트 LED 스탠드',   sku: 'LS-02', status: '판매중', price: 49000, stock: 22, updatedAt: '2025-08-14', saleEndAt: '2025-09-10' },
  { id: 8,  category: '전자제품', name: '폰카 망원 렌즈',     sku: 'LZ-04', status: '판매중', price: 34000, stock: 0,  updatedAt: '2025-08-13', saleEndAt: '2025-08-12' },

  // 화장품
  { id: 9,  category: '화장품',   name: '비건 딥클렌저',       sku: 'CL-10', status: '판매중', price: 19000, stock: 120, updatedAt: '2025-08-21', saleEndAt: '2025-11-30' },
  { id: 10, category: '화장품',   name: '촉촉 립밤',           sku: 'LB-12', status: '판매중', price: 9000,  stock: 200, updatedAt: '2025-08-20', saleEndAt: '2025-12-31' },
  { id: 11, category: '화장품',   name: '수분 크림 50ml',      sku: 'CR-50', status: '판매중', price: 27000, stock: 73,  updatedAt: '2025-08-18', saleEndAt: '2025-10-05' },
  { id: 12, category: '화장품',   name: '리프팅 마스크팩',     sku: 'MS-20', status: '품절',   price: 15000, stock: 0,   updatedAt: '2025-08-12', saleEndAt: '2025-08-10' },

  // 밀키트
  { id: 13, category: '밀키트',   name: '로제 파스타 2인분',   sku: 'MP-21', status: '판매중', price: 13500, stock: 36,  updatedAt: '2025-08-21', saleEndAt: '2025-08-31' },
  { id: 14, category: '밀키트',   name: '감바스 밀키트',       sku: 'GB-22', status: '판매중', price: 14900, stock: 18,  updatedAt: '2025-08-19', saleEndAt: '2025-09-15' },
  { id: 15, category: '밀키트',   name: '부대찌개 밀키트',     sku: 'BJ-23', status: '판매중', price: 11900, stock: 5,   updatedAt: '2025-08-18', saleEndAt: '2025-08-22' },

  // 무형자산
  { id: 16, category: '무형자산', name: 'UX 설문/리뷰 패키지', sku: 'UX-90', status: '판매중', price: 99000, stock: 999, updatedAt: '2025-08-17', saleEndAt: '2025-12-31' },
  { id: 17, category: '무형자산', name: '포토 리뷰 템플릿',     sku: 'PT-91', status: '판매중', price: 29000, stock: 999, updatedAt: '2025-08-16', saleEndAt: '2025-12-31' },
  { id: 18, category: '무형자산', name: '번역 쿠폰 10회',      sku: 'TR-92', status: '품절',   price: 59000, stock: 0,   updatedAt: '2025-08-15', saleEndAt: '2025-08-01' },
]

// 편의 유틸(선택)
export const getProductByIdMock = (id) =>
  productsMock.find((p) => p.id === Number(id))
