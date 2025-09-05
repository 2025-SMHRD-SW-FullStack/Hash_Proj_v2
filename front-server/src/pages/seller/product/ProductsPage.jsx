// /src/pages/seller/product/ProductsPage.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StatusChips from '/src/components/seller/StatusChips'
import Button from '/src/components/common/Button'
import Modal from '/src/components/common/Modal'
import { getMyProducts, deleteMyProduct as deleteProduct, deleteProduct as _aliasDelete } from '/src/service/productService'
import { fmtYmd } from '/src/util/orderUtils'
import { TableToolbar } from '../../../components/common/table/TableToolbar'

// ---- UI 토큰 (OrdersPage 스타일과 동일한 톤)
const box = 'rounded-xl border bg-white p-4 shadow-sm'
const pill = 'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[12px] font-medium'

// 목록 높이: 10행 + 헤더 기준
const ROW_H = 48
const HEADER_H = 44
const MAX_ROWS = 10
const tableMaxH = `${ROW_H * MAX_ROWS + HEADER_H}px`

// 제품 상태 칩(OrdersPage의 STATUS_ITEMS 형태와 동일 인터페이스)
const STATUS_ITEMS = [
  { key: 'ALL', label: '전체' }, // = 판매중 + 품절(판매종료 포함)
  { key: 'ONSALE', label: '판매중' },
]

// ---- 정렬 유틸: updatedAt → createdAt → id, "나이순(오래된 순, ASC)"
const pickTs = (p) =>
  p.updatedAt || p.modifiedAt || p.lastModifiedAt ||
  p.updated_at || p.modified_at ||
  p.createdAt || p.created_at || null

const toMs = (s) => {
  if (!s) return 0
  const ms = Date.parse(String(s).replace(' ', 'T'))
  return Number.isFinite(ms) ? ms : 0
}

const sortByAgeAsc = (list) =>
  [...list].sort((a, b) => {
    const am = toMs(pickTs(a)) || (a.id ?? 0)
    const bm = toMs(pickTs(b)) || (b.id ?? 0)
    return am - bm // 오래된 순
  })

export default function ProductsPage() {
  const [sp, setSp] = useSearchParams()
  const status = sp.get('status') || 'ALL'
  const q = sp.get('q') || ''

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 선택 체크박스 (OrdersPage 패턴 동일)
  const [selected, setSelected] = useState(new Set())
  const allVisibleIds = useMemo(() => (rows ?? []).map(r => r?.id), [rows])
  const isAllChecked = useMemo(
    () => allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id)),
    [allVisibleIds, selected]
  )
  const toggleAll = () => {
    const next = new Set(selected)
    if (isAllChecked) allVisibleIds.forEach(id => next.delete(id))
    else allVisibleIds.forEach(id => next.add(id))
    setSelected(next)
  }
  const toggleRow = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  // 삭제 모달
  const [delTarget, setDelTarget] = useState(null)
  const [delCheck, setDelCheck] = useState('')

  const setParam = (patch) => {
    const next = new URLSearchParams(sp)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k)
      else next.set(k, String(v))
    })
    setSp(next, { replace: true })
  }

  const handleReset = () => {
    setParam({ status: 'ONSALE', q: '' })
    setSelected(new Set())
  }

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await getMyProducts()
      // ✅ “수정날짜 반영 + 나이순(오래된 순)” 정렬
      const sorted = sortByAgeAsc(data || [])
      setRows(sorted)
      // 현재 화면에 없는 선택 정리
      setSelected(prev => {
        const visible = new Set((sorted || []).map(r => r?.id))
        const next = new Set()
        prev.forEach(id => { if (visible.has(id)) next.add(id) })
        return next
      })
    } catch (e) {
      setError(e?.response?.data?.message || e.message || '상품을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const now = Date.now()
  const isSoldOut = (p) => {
    const stock = Number(p?.stockTotal ?? 0)
    const end = p?.saleEndAt ? new Date(p.saleEndAt).getTime() : null
    // 요구사항: 판매기간 종료도 '품절'에 포함
    return stock <= 0 || (end && now > end)
  }

  // 상태/검색 필터 (정렬은 load에서 이미 적용됨)
  const filtered = useMemo(() => {
    let arr = rows ?? []
    if (status !== 'ALL') arr = arr.filter(p => !isSoldOut(p)) // 판매중만
    if (q.trim()) {
      const kw = q.trim().toLowerCase()
      arr = arr.filter(p =>
        String(p?.name ?? '').toLowerCase().includes(kw) ||
        String(p?.brand ?? '').toLowerCase().includes(kw)
      )
    }
    return arr
  }, [rows, status, q])

  const statusBadge = (p) => (
    isSoldOut(p)
      ? <span className={`${pill} bg-gray-100 text-gray-800`}>품절</span>
      : <span className={`${pill} bg-gray-100 text-gray-800`}>판매중</span>
  )

  const askDelete = (p) => { setDelTarget(p); setDelCheck('') }
  const cancelDelete = () => { setDelTarget(null); setDelCheck('') }
  const confirmDelete = async () => {
    const ok = delCheck === '삭제' || delCheck === (delTarget?.name || '')
    if (!ok) { alert('상품명과 일치하거나 "삭제"를 입력해야 합니다.'); return }
    try {
      await (deleteProduct ?? _aliasDelete)(delTarget.id)
      cancelDelete()
      load()
    } catch (e) {
      alert(e?.response?.data?.message || e.message || '삭제 실패')
    }
  }

  const priceText = (p) => {
    const base = Number(p?.basePrice ?? 0)
    const sale = Number(p?.salePrice ?? 0)
    return (sale > 0 ? sale : base).toLocaleString('ko-KR') + '원'
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">상품 관리</h1>
      </div>

      {/* 필터바 */}
      <section className={`${box} mb-4`}>
        <TableToolbar
          statusChips={STATUS_ITEMS.map(item => ({ value: item.key, label: item.label }))}
          selectedStatus={status}
          onSelectStatus={(v) => setParam({ status: v })}
          searchValue={q}
          onChangeSearch={(val) => setParam({ q: val })}
          onSubmitSearch={() => setParam({ q })}
          right={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="admin"
                onClick={handleReset}
              >
                초기화
              </Button>
              <Button
                size="sm"
                variant="admin"
                onClick={() => window.location.assign('/seller/products/new')}
              >
                상품 등록
              </Button>
            </div>
          }
        />
      </section>


      {/* 목록 (주문관리 표 스타일: 내부 양방향 스크롤 + sticky header) */}
      <section className={box}>
        {/* ✅ 표 박스 내부에서만 세로/가로 스크롤 */}
        <div className="relative overflow-auto" style={{ maxHeight: tableMaxH }}>
          <table className="w-full min-w-[1200px] table-fixed text-center text-sm">
            <colgroup>
              {[44, 240, 160, 120, 110, 110, 220, 200].map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>

            <thead className="sticky top-0 z-10 border-b bg-white text-[13px] text-gray-500">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={toggleAll}
                    aria-label="전체 선택"
                  />
                </th>
                <th className="px-3 py-2 text-left">상품명</th>
                <th className="px-3 py-2 text-left">브랜드</th>
                <th className="px-3 py-2">가격</th>
                <th className="px-3 py-2">재고</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">판매기간</th>
                <th className="px-3 py-2">관리</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr><td className="px-3 py-10 text-center" colSpan={8}>불러오는 중…</td></tr>
              )}
              {(!loading && filtered.length === 0) && (
                <tr><td className="px-3 py-10 text-center text-gray-500" colSpan={8}>데이터가 없습니다.</td></tr>
              )}

              {filtered.map((p) => {
                const id = p.id
                return (
                  <tr key={id} className="border-b last:border-none">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleRow(id)}
                        aria-label="행 선택"
                      />
                    </td>
                    <td className="px-3 py-2 text-left">{p.name}</td>
                    <td className="px-3 py-2 text-left">{p.brand || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{priceText(p)}</td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {Number(p?.stockTotal ?? 0).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {statusBadge(p)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {fmtYmd(p?.saleStartAt)} ~ {fmtYmd(p?.saleEndAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button size="sm" variant="admin" onClick={() => window.location.assign(`/seller/products/${id}/edit`)}>수정</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDelTarget(p)}>삭제</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="h-8" />

      {/* 삭제 모달 (2단계 확인) */}
      <Modal open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)} title="상품 삭제">
        {delTarget ? (
          <div className="space-y-3 p-2">
            <p className="text-sm">
              삭제 후 복구할 수 없습니다. 아래에 상품명 <b>{delTarget?.name}</b> 또는 <b>삭제</b>를 입력하세요.
            </p>
            <input
              className="w-full rounded-md border px-2 py-1 text-sm"
              value={delCheck}
              onChange={(e) => setDelCheck(e.target.value)}
              placeholder={`${delTarget?.name} 또는 "삭제"`}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={cancelDelete}>취소</Button>
              <Button onClick={confirmDelete}>영구 삭제</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
