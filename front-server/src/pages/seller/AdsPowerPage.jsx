// /src/pages/seller/AdsPowerPage.jsx
import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { CATEGORIES } from '../../constants/products'
import { getMyProducts } from '/src/service/productService' // 셀러 소유 상품 전용
import { fetchAdUnavailableDates, fetchAdInventory, createAdBooking /*, confirmAdPayment*/ } from '/src/service/adsService'
import { AD_SLOT_TYPES } from '/src/constants/ads'

import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

const inputCls = 'w-full h-10 rounded-lg border px-3 text-sm box-border max-w-full'
const box = 'rounded-xl border bg-white p-4 shadow-sm'
const Field = ({ label, children, hint }) => (
  <label className="mb-3 block">
    <div className="mb-1 text-sm font-medium text-gray-700">{label}</div>
    {children}
    {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
  </label>
)

// UI 라벨 ↔ 백엔드 enum 매핑
const POSITIONS = [
  { key: 'mainBanner',    label: '메인 롤링 배너',     type: AD_SLOT_TYPES.MAIN_ROLLING,  capacity: 10, price: { 7: 15000, 14: 25000, 30: 45000 } },
  { key: 'mainRight',     label: '메인 오른쪽 구좌',   type: AD_SLOT_TYPES.MAIN_SIDE,     capacity: 3,  price: { 7: 12000, 14: 20000, 30: 40000 } },
  { key: 'productList',   label: '상품목록 (파워광고)', type: AD_SLOT_TYPES.CATEGORY_TOP,  capacity: 5,  price: { 7: 8000,  14: 15000, 30: 30000 } },
  { key: 'orderComplete', label: '주문완료',           type: AD_SLOT_TYPES.ORDER_COMPLETE, capacity: 5,  price: { 7: 5000,  14: 10000, 30: 20000 } },
]

const PERIODS = [7, 14, 30]

// ---- date utils
const toDate = (s) => (s ? new Date(s + 'T00:00:00') : null)
const fmt = (n) => (n || 0).toLocaleString()
const ymd = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const addDaysDate = (date, n) => {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
const addDaysStr = (dateStr, days) => {
  const d = toDate(dateStr)
  if (!d) return ''
  const nd = addDaysDate(d, days - 1)
  return ymd(nd)
}
const truncate10 = (s = '') => {
  const arr = Array.from(String(s))
  return arr.length > 10 ? arr.slice(0, 10).join('') + '…' : s
}

export default function AdsPowerPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    productId: '',
    position: 'mainBanner',
    period: 7,
    startDate: '',
    endDate: '',
    agree: false,
  })
  const [category, setCategory] = useState('')

  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])     // 내 상품 목록
  const [inventory, setInventory] = useState([])   // (디버그) 최근 인벤토리
  const [booking, setBooking] = useState(null)     // 예약 결과

  const positionConf = useMemo(() => POSITIONS.find((p) => p.key === form.position) || POSITIONS[0], [form.position])
  const price = positionConf?.price?.[form.period] || 0

  // ---- DayPicker 범위 & 선택 불가 세트
  const today = useMemo(() => new Date(), [])
  const calendarFrom = today
  const calendarTo = useMemo(() => addDaysDate(today, 90), [today])
  const [unavailableSet, setUnavailableSet] = useState(new Set()) // 'YYYY-MM-DD' Set

  // 카테고리 바뀌면 내 상품 로드
  useEffect(() => {
    if (!category) { setProducts([]); setForm((s)=>({ ...s, productId: '' })); return }
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const data = await getMyProducts({ q: '', page: 0, size: 200, category })
        const list = Array.isArray(data) ? data : (data?.content || [])
        const normalized = list.map((p) => ({
          id: p.id ?? p.productId,
          name: p.name || p.productName || `상품#${p.id ?? p.productId}`,
          category: p.category || p.categoryName,
        }))
        if (alive) setProducts(normalized.filter((p)=>!category || p.category===category))
      } catch (e) {
        console.error(e)
        if (alive) setProducts([])
        alert('상품 목록을 불러오지 못했습니다. (로그인/셀러 승인 상태 확인)')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [category])

  // 위치/카테고리 변경 시, 달력의 "선택 불가 날짜" 미리 로드
  useEffect(() => {
    // CATEGORY_TOP은 category 필수. 없으면 비우고 대기
    if (positionConf.type === AD_SLOT_TYPES.CATEGORY_TOP && !category) {
      setUnavailableSet(new Set()); return
    }
    ;(async () => {
      try {
        setLoading(true)
        const set = await fetchAdUnavailableDates({
          type: positionConf.type,
          category,
          startDate: ymd(calendarFrom),
          endDate: ymd(calendarTo),
        })
        setUnavailableSet(set)
      } catch (e) {
        console.error(e)
        setUnavailableSet(new Set())
      } finally {
        setLoading(false)
      }
    })()
  }, [positionConf.type, category])

  const on = (k) => (e) => {
    const v = e.target.value
    setForm((s) => {
      const next = { ...s, [k]: v }
      if (k === 'period' || k === 'startDate') {
        const days = Number(k === 'period' ? v : next.period || 0)
        next.endDate = addDaysStr(next.startDate, days)
      }
      return next
    })
  }

  const productOptions = useMemo(() => {
    return products.map((p) => ({ id: p.id, name: truncate10(p.name) }))
  }, [products])

  const canSubmit = useMemo(() => {
    return !!(category && form.productId && form.position && form.period && form.startDate && form.endDate && form.agree)
  }, [category, form])

  // 시작일 비활성 판정: 선택한 period 동안 하루라도 막힌 날이 있으면 해당 시작일은 비활성
  const isStartDisabled = (dateObj) => {
    if (!dateObj) return true
    if (positionConf.type === AD_SLOT_TYPES.CATEGORY_TOP && !category) return true

    const days = Number(form.period || 0)
    if (!days) return true

    // 범위 밖
    if (dateObj < calendarFrom || dateObj > calendarTo) return true

    for (let i = 0; i < days; i++) {
      const d = addDaysDate(dateObj, i)
      const key = ymd(d)
      if (unavailableSet.has(key)) return true
    }
    return false
  }

  // 🔎 (선택) 인벤토리 확인 버튼 동작: 디버그용
  const checkInventory = async () => {
    if (!category || !form.startDate || !form.endDate) return alert('카테고리/기간을 먼저 선택하세요.')
    try {
      setLoading(true)
      const res = await fetchAdInventory({
        type: positionConf.type,
        category,
        startDate: form.startDate,
        endDate: form.endDate,
      })
      setInventory(res || [])
      const available = (res || []).find((d) => d.available)
      alert(available ? `가용 슬롯 있음 (slotId=${available.slotId})` : '가용 슬롯이 없습니다.')
    } catch (e) {
      console.error(e)
      alert('인벤토리 조회 실패')
    } finally {
      setLoading(false)
    }
  }

  // ✅ 신청하기: 인벤토리 재조회 → 첫 가용 슬롯으로 예약 생성
  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return alert('필수값을 모두 선택해 주세요.')

    try {
      setLoading(true)
      const res = await fetchAdInventory({
        type: positionConf.type,
        category,
        startDate: form.startDate,
        endDate: form.endDate,
      })
      const available = (res || []).find((d) => d.available)
      if (!available) return alert('선택한 기간에는 가용 슬롯이 없습니다. 다른 날짜를 선택해 주세요.')

      const bookingRes = await createAdBooking({
        slotId: available.slotId,
        productId: Number(form.productId),
        startDate: form.startDate,
        endDate: form.endDate,
      })
      setBooking(bookingRes)

      const finalPrice = bookingRes?.price ?? price
      alert(`예약이 생성되었습니다.\n예약번호: ${bookingRes?.bookingId}\n결제금액: ${fmt(finalPrice)}원`)

      // (선택) Toss 결제까지 즉시
      // const orderId = `ad-${bookingRes.bookingId}-${Date.now()}`
      // const paymentKey = `TEST-${bookingRes.bookingId}`
      // const confirm = await confirmAdPayment({ paymentKey, orderId, amount: finalPrice, bookingId: bookingRes.bookingId })
      // alert('결제가 완료되었습니다.')
      // navigate('/seller')

    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.message || '광고 신청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4">
      <h1 className="mb-4 text-xl font-semibold">파워광고 신청</h1>

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* 좌측 – 입력 */}
        <section className={`${box} lg:mb-0`}>
          <Field label="카테고리">
            <select value={category} onChange={(e)=>setCategory(e.target.value)} className={inputCls}>
              <option value="">카테고리를 선택하세요</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="상품 선택" hint="표시는 최대 10글자">
            <select
              value={form.productId}
              onChange={on('productId')}
              className={inputCls}
              disabled={!category || loading}
            >
              <option value="">{category ? '상품을 선택하세요' : '카테고리를 먼저 선택하세요'}</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {!category ? null : productOptions.length === 0 ? (
              <p className="mt-2 text-xs text-gray-500">해당 카테고리에 등록된 상품이 없습니다.</p>
            ) : null}
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="광고 위치" hint="동시 노출 가능 개수는 표 참고">
              <select
                value={form.position}
                onChange={on('position')}
                className={inputCls}
              >
                {POSITIONS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </Field>

            <Field label="광고 기간">
              <select value={form.period} onChange={on('period')} className={inputCls}>
                {PERIODS.map((d) => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </Field>

            {/* ✅ 달력: 불가일은 아예 선택 비활성 */}
            <Field label="시작일">
              <div className="rounded-lg border p-2">
                <DayPicker
                  mode="single"
                  captionLayout="dropdown"
                  fromDate={calendarFrom}
                  toDate={calendarTo}
                  selected={form.startDate ? new Date(form.startDate) : undefined}
                  onDayClick={(d, { disabled }) => {
                    if (disabled) return
                    const start = ymd(d)
                    const end = addDaysStr(start, Number(form.period))
                    setForm((s) => ({ ...s, startDate: start, endDate: end }))
                  }}
                  disabled={isStartDisabled}
                />
              </div>
            </Field>

            <Field label="종료일">
              <input
                type="text"
                value={form.endDate}
                readOnly
                className={`${inputCls} bg-gray-50 min-w-0`}
                placeholder="YYYY-MM-DD"
              />
            </Field>
          </div>

          {/* ✅ 동의 + 버튼 */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={() => setForm((s) => ({ ...s, agree: !s.agree }))}
              />
              광고 운영 정책 및 결제에 동의합니다.
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="unselected" onClick={() => navigate('/seller')}>
                취소
              </Button>
              <Button type="submit" disabled={loading || !canSubmit}>신청하기</Button>
            </div>
          </div>
        </section>

        {/* 우측 – 요약 (데스크탑 우측, 모바일에서는 아래로) */}
        <aside className={`${box}`}>
          <h2 className="mb-2 text-base font-semibold">신청 요약</h2>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center justify-between"><span>카테고리</span><span>{category || '-'}</span></li>
            <li className="flex items-center justify-between"><span>상품</span><span>{(productOptions.find((p)=>String(p.id)===String(form.productId))?.name) || '-'}</span></li>
            <li className="flex items-center justify-between"><span>위치</span><span>{positionConf?.label}</span></li>
            <li className="flex items-center justify-between"><span>기간</span><span>{form.period}일</span></li>
            <li className="flex items-center justify-between"><span>시작일</span><span>{form.startDate || '-'}</span></li>
            <li className="flex items-center justify-between"><span>종료일</span><span>{form.endDate || '-'}</span></li>
            <li className="flex items-center justify-between font-semibold"><span>결제 예정 금액</span><span className="tabular-nums">{fmt(price)}원</span></li>
          </ul>

          <hr className="my-4" />

          <h3 className="mb-1 text-sm font-medium text-gray-700">동시 노출 가능 개수</h3>
          <ul className="space-y-1 text-sm">
            {POSITIONS.map((p) => (
              <li key={p.key} className="flex items-center justify-between">
                <span>{p.label}</span>
                <span className="tabular-nums">{p.capacity}개</span>
              </li>
            ))}
          </ul>

          {/* (디버그) 최근 인벤토리 확인 결과 */}
          {!!inventory?.length && (
            <div className="mt-4 rounded-lg border p-2 text-xs text-gray-600">
              <div className="mb-1 font-medium">인벤토리 확인 결과</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {inventory.map((it) => (
                  <div key={`${it.slotId}-${it.position}`} className="rounded border p-2">
                    <div>slotId: {it.slotId}</div>
                    <div>pos: {it.position}</div>
                    <div className={it.available ? 'text-emerald-600' : 'text-red-500'}>
                      {it.available ? '가능' : '불가'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </form>

      <div className="h-8" />
    </div>
  )
}
