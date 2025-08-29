// /src/service/statsService.js
import api from '/src/config/axiosInstance'
import { fetchSellerOrders as _fetchSellerOrders } from '/src/service/orderService'

// 404/405면 다음 후보로 넘어가고, 그 외엔 즉시 throw
const tryGet = async (path, params) => {
    const res = await api.get(path, {
        params,
        // 404/405도 reject 하지 않도록 (콘솔 빨간 에러 제거)
        validateStatus: () => true,
    })
    if (res.status === 404 || res.status === 405) return null
    if (res.status >= 200 && res.status < 300) return res.data
    // 기타 상태코드는 실제 에러로 처리
    throw new Error(`GET ${path} failed: ${res.status}`)
}

// YYYY-MM-DD -> MM/DD
const toMMDD = (ymd) => {
    const s = String(ymd || '').replace(/[^0-9]/g, '')
    if (s.length >= 8) return `${s.slice(4, 6)}/${s.slice(6, 8)}`
    return ymd || ''
}

const resolveDate = (r) =>
    r?.deliveredAt?.slice(0, 10) ||
    r?.paidAt?.slice(0, 10) ||
    r?.createdAt?.slice(0, 10) ||
    null

const resolveAmount = (r) =>
    r?.payAmount ?? r?.amount ?? r?.totalAmount ?? r?.paymentAmount ?? 0

const normalizeStats = (arr) =>
    arr.map((x) => ({
        date:
            toMMDD(x.date || x.statDate || x.day || x.createdDate || x.deliveredDate),
        amount: Number(x.amount ?? x.amountSum ?? x.totalAmount ?? 0),
        orders: Number(x.orders ?? x.orderCount ?? 0),
        payers: Number(x.payers ?? x.payerCount ?? x.distinctBuyerCount ?? 0),
    }))

/** 백엔드 통계 API가 있으면 우선 사용, 없으면 주문목록으로 일간 집계 */
export const fetchSalesStats = async ({ from, to } = {}) => {
    const params = { from, to }

    // 1) 정식 통계 엔드포인트 후보들
    const direct =
        (await tryGet('/api/seller/stats/sales', params)) ||
        (await tryGet('/api/seller/orders/stats', params)) ||
        (await tryGet('/api/orders/stats', params))

    if (Array.isArray(direct)) return normalizeStats(direct)

    // 2) 폴백: 주문 목록 → 일자별 합산
    let rows
    try {
        const res = await _fetchSellerOrders?.({ from, to, size: 1000 })
        rows = res?.content || res?.list || res || []
    } catch (e) {
        const st = e?.response?.status
        if (st === 404 || st === 405) {
            const { data } = await api.get('/api/seller/orders', {
                params: { from, to, size: 1000 },
            })
            rows = data?.content || data?.list || data || []
        } else {
            throw e
        }
    }

    const byDate = new Map()
    for (const r of rows) {
        const dYmd = resolveDate(r)
        if (!dYmd) continue
        const key = dYmd
        const existing =
            byDate.get(key) || { date: toMMDD(key), amount: 0, orders: 0, payersSet: new Set() }
        existing.amount += Number(resolveAmount(r) || 0)
        existing.orders += 1
        const buyer =
            r?.buyerId || r?.memberId || r?.userId || r?.buyer?.id || r?.customerId
        if (buyer) existing.payersSet.add(buyer)
        byDate.set(key, existing)
    }

    return Array.from(byDate.values())
        .map((it) => ({
            date: it.date,
            amount: it.amount,
            orders: it.orders,
            payers: it.payersSet.size,
        }))
        .sort((a, b) => (a.date > b.date ? 1 : -1))
}
