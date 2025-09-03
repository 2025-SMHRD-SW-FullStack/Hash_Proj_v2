// /src/stores/orderStore.js
import { create } from 'zustand'

export const useOrderStore = create((set, get) => ({
  // 주문 목록
  orders: [],
  
  // 로딩 상태
  loading: false,
  
  // 에러 상태
  error: null,
  
  // 마지막 업데이트 시간
  lastUpdated: null,
  
  // 강제 새로고침 플래그
  forceRefresh: false,
  
  // 주문 통계 (실시간 계산)
  stats: {
    newOrders: 0,
    shipReady: 0,
    shipping: 0,
    shipped: 0,
    exchange: 0,
    returns: 0,
    cancels: 0,
    newFeedbacks: 0,
    purchaseConfirmed: 0,
  },
  
  // 주문 목록 설정
  setOrders: (orders) => {
    const stats = calculateStats(orders)
    set({ 
      orders, 
      stats,
      lastUpdated: new Date().toISOString(),
      forceRefresh: false
    })
  },
  
  // 주문 상태 업데이트
  updateOrderStatus: (orderId, newStatus, updates = {}) => set((state) => {
    const updatedOrders = state.orders.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus, ...updates }
        : order
    )
    
    const stats = calculateStats(updatedOrders)
    
    return {
      orders: updatedOrders,
      stats,
      lastUpdated: new Date().toISOString()
    }
  }),
  
  // 주문 추가/수정
  upsertOrder: (order) => set((state) => {
    const existingIndex = state.orders.findIndex(o => o.id === order.id)
    let newOrders
    
    if (existingIndex >= 0) {
      // 기존 주문 업데이트
      newOrders = [...state.orders]
      newOrders[existingIndex] = { ...newOrders[existingIndex], ...order }
    } else {
      // 새 주문 추가
      newOrders = [...state.orders, order]
    }
    
    const stats = calculateStats(newOrders)
    
    return { 
      orders: newOrders,
      stats,
      lastUpdated: new Date().toISOString() 
    }
  }),
  
  // 로딩 상태 설정
  setLoading: (loading) => set({ loading }),
  
  // 에러 상태 설정
  setError: (error) => set({ error }),
  
  // 강제 새로고침 설정
  setForceRefresh: (forceRefresh) => set({ forceRefresh }),
  
  // 주문 목록 새로고침 필요 여부 확인
  needsRefresh: () => {
    const { lastUpdated, forceRefresh } = get()
    if (forceRefresh) return true
    if (!lastUpdated) return true
    
    const now = new Date()
    const lastUpdate = new Date(lastUpdated)
    const diffMinutes = (now - lastUpdate) / (1000 * 60)
    
    // 5분 이상 지났으면 새로고침 필요
    return diffMinutes > 5
  },
  
  // 주문 목록 초기화
  clearOrders: () => set({ 
    orders: [], 
    stats: {
      newOrders: 0,
      shipReady: 0,
      shipping: 0,
      shipped: 0,
      exchange: 0,
      returns: 0,
      cancels: 0,
      newFeedbacks: 0,
      purchaseConfirmed: 0,
    },
    lastUpdated: null, 
    error: null,
    forceRefresh: false
  }),
}))

// 주문 통계 계산 함수
function calculateStats(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return {
      newOrders: 0,
      shipReady: 0,
      shipping: 0,
      shipped: 0,
      exchange: 0,
      returns: 0,
      cancels: 0,
      newFeedbacks: 0,
      purchaseConfirmed: 0,
    }
  }
  
  const by = (fn) => orders.filter(fn).length
  
  // 백엔드 OrderStatus enum 기반 상태 정규화
  const normStatus = (s) => {
    if (!s) return ''
    const u = String(s).toUpperCase()
    
    // 백엔드 enum과 직접 매칭
    if (['PENDING', 'PAID', 'READY', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED'].includes(u)) {
      return u
    }
    
    // 한글 상태를 백엔드 enum으로 변환
    if (u.includes('신규') || u.includes('결제완료') || u.includes('배송준비')) return 'READY'  // 신규주문/배송준비 → READY
    if (u.includes('교환')) return 'EXCHANGE'
    if (u.includes('반품')) return 'RETURN'
    if (u.includes('취소')) return 'CANCEL'
    if (u.includes('준비') || u.includes('발송') || u.includes('배송준비')) return 'READY'
    if (u.includes('배송중') || u.includes('운송중')) return 'IN_TRANSIT'
    if (u.includes('배송완료') || u.includes('완료')) return 'DELIVERED'
    if (u.includes('구매확정') || u.includes('확정')) return 'CONFIRMED'
    
    return u
  }
  
  // 구매확정 여부 추정
  const isPurchaseConfirmed = (r) => {
    const status = normStatus(r?.status || r?.orderStatus)
    return status === 'CONFIRMED' || r?.purchaseConfirmed === true
  }
  
  return {
    newOrders: by((o) => normStatus(o?.status || o?.orderStatus) === 'READY'),  // 신규주문: READY 상태
    shipReady: by((o) => normStatus(o?.status || o?.orderStatus) === 'READY'),  // 배송준비: READY 상태 (신규주문과 동일)
    shipping: by((o) => normStatus(o?.status || o?.orderStatus) === 'IN_TRANSIT'),
    shipped: by((o) => normStatus(o?.status || o?.orderStatus) === 'DELIVERED'),
    exchange: by((o) => (o?.exchangeRequested === true) || normStatus(o?.status || o?.orderStatus) === 'EXCHANGE'),
    returns: by((o) => (o?.returnRequested === true) || normStatus(o?.status || o?.orderStatus) === 'RETURN'),
    cancels: by((o) => (o?.cancelRequested === true) || normStatus(o?.status || o?.orderStatus) === 'CANCEL'),
    newFeedbacks: by((o) => (o?.feedbackSubmitted && !o?.feedbackReviewed) || false),
    purchaseConfirmed: by((o) => isPurchaseConfirmed(o)),
  }
}
