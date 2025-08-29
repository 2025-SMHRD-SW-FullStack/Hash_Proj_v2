// /src/pages/seller/product/ProductsPage.jsx
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../../components/common/Button'
import StatusChips from '../../../components/seller/StatusChips'
import { STATUS as STATUS_LIST } from '../../../constants/products'
import { productsMock } from '../../../data/products.mock'

const box = 'rounded-xl border bg-white p-4 shadow-sm'
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n)
const todayStr = () => new Date().toISOString().slice(0, 10)
const cut = (s, n = 10) => {
  const arr = Array.from(String(s ?? ''))
  return arr.length <= n ? s : arr.slice(0, n).join('') + '…'
}

const isExpired = (p) => p.saleEndAt && p.saleEndAt < todayStr()
const effectiveStatus = (p) => (isExpired(p) ? '품절' : p.status)

// 상단에 한 번 선언(행 높이/헤더 높이 잡아서 10행 기준으로 계산)
const ROW_H = 48;           // 한 행 대략 높이(px) (py-2, text-sm 기준)
const HEADER_H = 44;        // thead 높이(px)
const MAX_ROWS = 10;
const tableMaxH = `${ROW_H * MAX_ROWS + HEADER_H}px`;



const StatusBadge = ({ value, expired }) => {
  const cls =
    value === '판매중'
      ? 'rounded-md bg-green-50 px-2 py-1 text-[12px] text-green-700 ring-1 ring-green-200'
      : 'rounded-md bg-gray-100 px-2 py-1 text-[12px] text-gray-600 ring-1 ring-gray-200'
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cls}>{value}</span>
    </span>
  )
}

export default function ProductsPage() {
  const navigate = useNavigate()
  // ✅ 더미데이터로 초기화
  const [items, setItems] = useState(productsMock)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')

  // 칩 카운트
  const counts = useMemo(() => {
    const c = { ALL: items.length }
    STATUS_LIST.forEach((s) => (c[s] = items.filter((p) => effectiveStatus(p) === s).length))
    return c
  }, [items])

  const rows = useMemo(() => {
    return items.filter((p) => {
      const s = effectiveStatus(p)
      const okStatus = status === 'ALL' ? true : s === status
      const okQ =
        q.trim() === '' ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.sku.toLowerCase().includes(q.toLowerCase())
      return okStatus && okQ
    })
  }, [items, q, status])

  const handleEdit = (id) => navigate(`/seller/products/${id}/edit`)
  const handleNew = () => navigate('/seller/products/new')
  const handleDelete = (id) => {
    if (window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      setItems((prev) => prev.filter((x) => x.id !== id))
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">상품관리</h1>
      </div>

      {/* 필터바 */}
      <section className={`${box} mb-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChips
            items={[
              { key: 'ALL', label: '전체', count: counts.ALL },
              ...STATUS_LIST.map((s) => ({ key: s, label: s, count: counts[s] })),
            ]}
            value={status}
            onChange={setStatus}
            size="sm"
            variant="primary"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="상품명 검색"
            className="w-64 rounded-lg border px-3 py-2 text-sm outline-none focus:ring"
          />
          <Button size="sm" onClick={() => { setQ(''); setStatus('ALL') }}>
            초기화
          </Button>
          <Button size="sm" className="ml-auto" onClick={handleNew}>
            상품 등록
          </Button>
        </div>
      </section>

      <section className={box}>
        <div className="overflow-x-auto" style={{ maxHeight: tableMaxH }}>
          <table className="w-full table-fixed text-center text-sm">
            <colgroup>
              <col style={{ width: '10%' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b bg-gray-50 text-[13px] text-gray-500">
              <tr>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">상품명</th>
                <th className="px-3 py-2">가격</th>
                <th className="px-3 py-2">재고</th>
                <th className="px-3 py-2">판매 종료일</th>
                <th className="px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b last:border-none">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <StatusBadge value={effectiveStatus(p)} expired={isExpired(p)} />
                  </td>
                  <td className="px-3 py-2" title={p.name}>
                    {cut(p.name, 10)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(p.price)}원</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(p.stock)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">{p.saleEndAt}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(p.id)}>수정</Button>
                      <Button size="sm" variant="signUp" onClick={() => handleDelete(p.id)}>삭제</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-gray-500">결과가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="h-8" />
    </div>
  )
}
