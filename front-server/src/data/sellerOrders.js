// src/data/sellerOrders.js

// 더미 주문 20건 (목업)
// 필드: id, product, buyer, price, status, orderedAt, deliveredAt, feedbackAt,
//       address, phone, requestNote, carrierCode, trackingNo, exchangeRequested, feedbackText

const SELLER_ORDERS_MOCK = [
  { id:'2025082400000001', product:'무선 미니 선풍기 에디션 블루', buyer:'김민수', price:39000, status:'배송준비중', orderedAt:'2025-08-24', deliveredAt:null,        feedbackAt:null, address:'서울시 강남구 테헤란로 123, 101동 1001호', phone:'010-1111-1111', requestNote:'부재 시 문앞', carrierCode:'',        trackingNo:'',       exchangeRequested:false, feedbackText:'' },
  { id:'2025082300000002', product:'대용량 2L 탱크 제습기',         buyer:'박하늘', price:59000, status:'배송중',   orderedAt:'2025-08-23', deliveredAt:null,        feedbackAt:null, address:'부산시 해운대구 A로 45, 305호',             phone:'010-2222-2222', requestNote:'',        carrierCode:'CJ',     trackingNo:'CJ-1111', exchangeRequested:false, feedbackText:'' },
  { id:'2025082300000003', product:'UVC 듀얼램프 살균 케이스',       buyer:'이도윤', price:42000, status:'배송완료', orderedAt:'2025-08-23', deliveredAt:'2025-08-24', feedbackAt:null, address:'성남시 분당구 판교역로 23, 2층',           phone:'010-3333-3333', requestNote:'',        carrierCode:'EPOST',  trackingNo:'CU-1002', exchangeRequested:false, feedbackText:'' },

  // ✅ 수기 구매확정 후 피드백 작성(마감 이전)
  { id:'2025082200000004', product:'휴대용 미니 공기청정기',         buyer:'정소연', price:52000, status:'배송완료', orderedAt:'2025-08-22', deliveredAt:'2025-08-20', feedbackAt:'2025-08-22', address:'대전시 유성구 대학로 1',              phone:'010-4444-4444', requestNote:'경비실',   carrierCode:'LOGEN',  trackingNo:'GZ-2204', exchangeRequested:true,  feedbackText:'차 안/책상 양쪽에서 사용 중. 소음이 적고 필터 교체도 쉬워요DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD.' },

  { id:'2025082200000005', product:'스마트 온도계',                 buyer:'최다인', price:18000, status:'배송준비중', orderedAt:'2025-08-22', deliveredAt:null,        feedbackAt:null, address:'광주시 서구 상무대로 90',                 phone:'010-5555-5555', requestNote:'',        carrierCode:'',        trackingNo:'',       exchangeRequested:false, feedbackText:'' },
  { id:'2025082100000006', product:'USB 충전식 미니 선풍기',         buyer:'한서준', price:26000, status:'배송중',   orderedAt:'2025-08-21', deliveredAt:null,        feedbackAt:null, address:'수원시 영통구 광교로 11',                 phone:'010-6666-6666', requestNote:'',        carrierCode:'HANJIN', trackingNo:'HJ-3211', exchangeRequested:false, feedbackText:'' },

  // ⏱ 자동확정(마감 경과, 미작성)
  { id:'2025082000000007', product:'자외선 칫솔 살균기',             buyer:'오지후', price:27000, status:'배송완료', orderedAt:'2025-08-20', deliveredAt:'2025-08-15', feedbackAt:null, address:'울산시 남구 삼산로 55',                   phone:'010-7777-7777', requestNote:'',        carrierCode:'LOTTE',  trackingNo:'LT-9907', exchangeRequested:false, feedbackText:'' },

  // ✅ 수기 구매확정 후 피드백 작성(마감 이전으로 수정)
  { id:'2025082000000008', product:'무선 전동 드라이버',             buyer:'이하린', price:49000, status:'배송완료', orderedAt:'2025-08-20', deliveredAt:'2025-08-18', feedbackAt:'2025-08-24', address:'창원시 성산구 중앙대로 100',          phone:'010-8888-8888', requestNote:'',        carrierCode:'CJ',     trackingNo:'CJ-2222', exchangeRequested:false, feedbackText:'조립가구 설치에 사용. 토크도 충분하고 손목에 무리 없어요.' },

  { id:'2025081900000009', product:'스마트 체중계',                 buyer:'문예진', price:35000, status:'배송중',   orderedAt:'2025-08-19', deliveredAt:null,        feedbackAt:null, address:'인천시 남동구 문화로 12',                phone:'010-9999-9999', requestNote:'',        carrierCode:'EPOST',  trackingNo:'CU-3344', exchangeRequested:false, feedbackText:'' },

  // ⏱ 자동확정(마감 경과, 미작성)
  { id:'2025081800000010', product:'접이식 노트북 거치대',           buyer:'강현우', price:21000, status:'배송완료', orderedAt:'2025-08-18', deliveredAt:'2025-08-10', feedbackAt:null, address:'세종시 나성북로 33',                      phone:'010-1010-1010', requestNote:'',        carrierCode:'KD',     trackingNo:'KD-1010', exchangeRequested:false, feedbackText:'' },

  { id:'2025082500000011', product:'초경량 보조배터리 10,000mAh',    buyer:'배수지', price:24000, status:'배송완료', orderedAt:'2025-08-25', deliveredAt:'2025-08-25', feedbackAt:null, address:'서울시 마포구 월드컵북로 400',              phone:'010-1212-1212', requestNote:'',        carrierCode:'CJ',     trackingNo:'CJ-5555', exchangeRequested:false, feedbackText:'' },
  { id:'2025081700000012', product:'블루투스 미니 스피커',           buyer:'허가온', price:39000, status:'배송준비중', orderedAt:'2025-08-17', deliveredAt:null,        feedbackAt:null, address:'부산시 기장군 정관로 200',               phone:'010-1313-1313', requestNote:'',        carrierCode:'',        trackingNo:'',       exchangeRequested:false, feedbackText:'' },

  // ✅ 수기 구매확정 후 피드백 작성(당일)
  { id:'2025082300000013', product:'프리미엄 캔버스 백팩',           buyer:'노지안', price:69000, status:'배송완료', orderedAt:'2025-08-23', deliveredAt:'2025-08-23', feedbackAt:'2025-08-23', address:'대구시 달서구 성서로 88',            phone:'010-1414-1414', requestNote:'',        carrierCode:'LOGEN',  trackingNo:'GZ-7788', exchangeRequested:false, feedbackText:'수납공간이 넉넉하고 어깨끈 쿠션감이 좋아요.' },

  // ⏱ 자동확정(마감 경과, 미작성)
  { id:'2025081600000014', product:'스마트 무선 탁상 스탠드',         buyer:'윤시우', price:33000, status:'배송완료', orderedAt:'2025-08-16', deliveredAt:'2025-08-16', feedbackAt:null, address:'광주시 광산구 임방울대로 17',             phone:'010-1515-1515', requestNote:'',        carrierCode:'HANJIN', trackingNo:'HJ-1616', exchangeRequested:false, feedbackText:'' },

  { id:'2025082100000015', product:'차박용 미니 선풍기 PRO',          buyer:'이하윤', price:46000, status:'배송중',   orderedAt:'2025-08-21', deliveredAt:null,        feedbackAt:null, address:'제주시 연삼로 22',                      phone:'010-1616-1616', requestNote:'',        carrierCode:'CJ',     trackingNo:'CJ-7878', exchangeRequested:false, feedbackText:'' },
  { id:'2025082100000016', product:'모션센서 LED 실내등',            buyer:'임하린', price:19000, status:'배송완료', orderedAt:'2025-08-21', deliveredAt:'2025-08-21', feedbackAt:null, address:'천안시 서북구 불당대로 12',                phone:'010-1717-1717', requestNote:'',        carrierCode:'EPOST',  trackingNo:'CU-2121', exchangeRequested:false, feedbackText:'' },
  { id:'2025081500000017', product:'자석 충전 케이블 (3in1)',        buyer:'김라온', price:15000, status:'배송준비중', orderedAt:'2025-08-15', deliveredAt:null,        feedbackAt:null, address:'용인시 기흥구 구갈로 1',                  phone:'010-1818-1818', requestNote:'',        carrierCode:'',        trackingNo:'',       exchangeRequested:false, feedbackText:'' },

  { id:'2025082000000018', product:'스마트 홈 카메라',               buyer:'정리호', price:72000, status:'배송중',   orderedAt:'2025-08-20', deliveredAt:null,        feedbackAt:null, address:'포항시 남구 중앙로 55',                   phone:'010-1919-1919', requestNote:'',        carrierCode:'LOTTE',  trackingNo:'LT-2020', exchangeRequested:false, feedbackText:'' },

  // ✅ 수기 구매확정 후 피드백 작성(마감 이전으로 수정)
  { id:'2025081900000019', product:'미니 전동 드릴 키트',            buyer:'오다인', price:58000, status:'배송완료', orderedAt:'2025-08-19', deliveredAt:'2025-08-19', feedbackAt:'2025-08-24', address:'창원시 마산합포구 합포로 9',          phone:'010-2020-2020', requestNote:'',        carrierCode:'CJ',     trackingNo:'CJ-9090', exchangeRequested:false, feedbackText:'집 안 간단 수리용으로 충분합니다. 배터리도 오래가요.' },

  // ✅ 수기 구매확정 후 피드백 작성(마감 이전)
  { id:'2025081400000020', product:'무선 가정용 제초기',             buyer:'박규민', price:97000, status:'배송완료', orderedAt:'2025-08-14', deliveredAt:'2025-08-14', feedbackAt:'2025-08-16', address:'의정부시 시민로 77',                 phone:'010-2121-2121', requestNote:'',        carrierCode:'KD',     trackingNo:'KD-1414', exchangeRequested:false, feedbackText:'성능 강력. 무게가 조금 있지만 휴대용 배터리로도 작동해요.' },
];

export default SELLER_ORDERS_MOCK;
