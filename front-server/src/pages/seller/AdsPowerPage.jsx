import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { productsMock as PRODUCTS_MOCK } from '../../data/products.mock'
import { CATEGORIES } from '../../constants/products'

const inputCls = 'w-full h-10 rounded-lg border px-3 text-sm box-border max-w-full'
const box = 'rounded-xl border bg-white p-4 shadow-sm'
const Field = ({ label, children, hint }) => (
  <label className="mb-3 block">
    <div className="mb-1 text-sm font-medium text-gray-700">{label}</div>
    {children}
    {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
  </label>
)

const POSITIONS = [
  { key: 'mainBanner', label: '메인 롤링 배너', capacity: 10, price: { 7: 15000, 14: 25000, 30: 45000 } },
  { key: 'mainRight', label: '메인 오른쪽 구좌', capacity: 3, price: { 7: 12000, 14: 20000, 30: 40000 } },
  { key: 'productList', label: '상품목록 (파워광고)', capacity: 5, price: { 7: 8000, 14: 15000, 30: 30000 } },
  { key: 'orderComplete', label: '주문완료', capacity: 5, price: { 7: 5000, 14: 10000, 30: 20000 } },
]

const FULLY_BOOKED_DATES = {
  mainBanner: ['2025-09-05', '2025-09-06'],
  mainRight: [],
  productList: ['2025-09-03'],
  orderComplete: [],
}

const PERIODS = [7, 14, 30]

const toDate = (s) => (s ? new Date(s + 'T00:00:00') : null)
const fmt = (n) => (n || 0).toLocaleString()
const addDays = (dateStr, days) => {
  const d = toDate(dateStr)
  if (!d) return ''
  const nd = new Date(d)
  nd.setDate(nd.getDate() + (days - 1))
  const y = nd.getFullYear()
  const m = String(nd.getMonth() + 1).padStart(2, '0')
  const dd = String(nd.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
const rangeDates = (startStr, days) => {
  const d = toDate(startStr)
  if (!d) return []
  return Array.from({ length: days }, (_, i) => {
    const nd = new Date(d)
    nd.setDate(d.getDate() + i)
    const y = nd.getFullYear()
    const m = String(nd.getMonth() + 1).padStart(2, '0')
    const dd = String(nd.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  })
}
const isStartAllowed = (positionKey, startStr, days) => {
  if (!startStr || !days) return true
  const booked = new Set(FULLY_BOOKED_DATES[positionKey] || [])
  const touches = rangeDates(startStr, days).some((d) => booked.has(d))
  return !touches
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

  const productOptions = useMemo(() => {
    const arr = Array.isArray(PRODUCTS_MOCK) ? PRODUCTS_MOCK : []
    const filtered = category ? arr.filter((p) => p.category === category) : []
    const sorted = [...filtered].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? '', 'ko-KR')
    )
    return sorted.map((p) => ({
      id: p.id ?? p.productId ?? p.sku ?? String(Math.random()),
      name: truncate10(p.name ?? p.title ?? p.productName ?? '상품'),
    }))
  }, [category])

  const positionMeta = useMemo(
    () => POSITIONS.find((p) => p.key === form.position) ?? POSITIONS[0],
    [form.position]
  )
  const price = useMemo(() => positionMeta.price?.[form.period] || 0, [positionMeta, form.period])

  const on = (k) => (e) => {
    const value = e.target.value
    setForm((s) => {
      if (k === 'period') {
        const periodDays = Number(value)
        const newEnd = s.startDate ? addDays(s.startDate, periodDays) : ''
        return { ...s, period: periodDays, endDate: newEnd }
      }
      if (k === 'startDate') {
        const newStart = value
        const newEnd = newStart ? addDays(newStart, s.period) : ''
        return { ...s, startDate: newStart, endDate: newEnd }
      }
      return { ...s, [k]: value }
    })
  }

  const onChangeStartDate = (e) => {
    const v = e.target.value
    const periodDays = Number(form.period)
    if (!v) return on('startDate')(e)
    if (!isStartAllowed(form.position, v, periodDays)) {
      alert('해당 위치는 선택한 기간에 이미 광고가 가득 차 있어 시작일을 선택할 수 없습니다.')
      setForm((s) => ({ ...s, startDate: '', endDate: '' }))
      return
    }
    on('startDate')(e)
  }

  const onChangeCategory = (e) => {
    const v = e.target.value
    setCategory(v)
    setForm((s) => ({ ...s, productId: '' }))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!category) return alert('카테고리를 선택하세요.')
    if (!form.productId) return alert('광고할 상품을 선택하세요.')
    if (!form.position) return alert('광고 위치를 선택하세요.')
    if (!form.period) return alert('광고 기간을 선택하세요.')
    if (!form.startDate) return alert('시작일을 선택하세요.')
    if (!isStartAllowed(form.position, form.startDate, form.period)) {
      return alert('선택한 시작일은 해당 위치에서 이미 가득 찬 기간과 겹칩니다.')
    }
    if (!form.agree) return alert('약관에 동의가 필요합니다.')

    const payload = {
      category,
      productId: form.productId,
      position: form.position,
      period: form.period,
      startDate: form.startDate,
      endDate: form.endDate,
      price,
    }

    console.log('Power Ads apply payload:', payload)
    alert(
      `임시: 파워광고 신청이 접수되었습니다.\n` +
      `위치: ${positionMeta.label}\n기간: ${form.period}일\n총 금액: ${fmt(price)}원`
    )
    navigate('/seller')
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">파워광고 신청</h1>
      </div>

      {/* 안내 */}
      <section className={`${box} mb-4`}>
        <ul className="list-disc pl-5 text-sm text-gray-600">
          <li>카테고리를 선택하면 해당 카테고리의 상품이 가나다 순으로 표시됩니다.</li>
          <li>노출 위치와 기간(7/14/30일)을 지정하면 가격이 자동 계산됩니다.</li>
          <div className="mt-2 min-w-0">
            <h2 className="mb-2 text-sm font-semibold">가격표</h2>
            <div className="space-y-2 text-xs text-gray-600">
              {POSITIONS.map((p) => (
                <div key={p.key}>
                  <div className="font-medium text-gray-800">{p.label}</div>
                  <div>7일 {fmt(p.price[7])}원 / 14일 {fmt(p.price[14])}원 / 30일 {fmt(p.price[30])}원</div>
                </div>
              ))}
            </div>
          </div>
        </ul>
      </section>

      {/* ✅ 반응형 레이아웃: 데스크탑 2:1, 모바일 1열(요약이 아래로) */}
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 좌측 – 설정 */}
        <section className={`${box} order-1 lg:col-span-2`}>
          <Field label="카테고리 선택">
            <select
              value={category}
              onChange={onChangeCategory}
              className={inputCls}
            >
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
              disabled={!category}
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
                {POSITIONS.map((pos) => (
                  <option key={pos.key} value={pos.key}>
                    {pos.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="광고 기간">
              <select
                value={form.period}
                onChange={on('period')}
                className={inputCls}
              >
                {PERIODS.map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="시작일">
              <div className="relative min-w-0">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={onChangeStartDate}
                  className={`${inputCls} appearance-none pr-8 min-w-0`}
                />
              </div>
            </Field>

            <Field label="종료일">
              <div className="min-w-0">
                <input
                  type="text"
                  value={form.endDate}
                  readOnly
                  className={`${inputCls} bg-gray-50 min-w-0`}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </Field>
          </div>



          {/* ✅ 동의 + 버튼을 왼쪽 폼 하단으로 이동 */}
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
              <Button type="button" variant="ghost" onClick={() => navigate('/seller')}>
                취소
              </Button>
              <Button type="submit">신청하기</Button>
            </div>
          </div>
        </section>

        {/* 우측 – 요약 (데스크탑 우측, 모바일에서는 아래로 내려감) */}
        <aside className={`${box} order-2 lg:order-2 lg:sticky lg:top-4 h-fit`}>
          <h2 className="mb-2 text-base font-semibold">광고 요약</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>카테고리</span>
              <strong>{category || '-'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>위치</span>
              <strong>{positionMeta.label}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>기간</span>
              <strong>{form.period}일</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>시작일</span>
              <strong>{form.startDate || '-'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>종료일</span>
              <strong>{form.endDate || '-'}</strong>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span>결제 금액</span>
              <strong>{fmt(price)}원</strong>
            </div>
          </div>

          <hr className="my-4" />

          <h3 className="mb-2 text-sm font-semibold">위치별 동시 노출 수량</h3>
          <ul className="space-y-1 text-sm text-gray-600 pl-0 list-none">
            {POSITIONS.map((p) => (
              <li key={p.key} className="flex items-center justify-between">
                <span>{p.label}</span>
                <span className="tabular-nums">{p.capacity}개</span>
              </li>
            ))}
          </ul>
        </aside>
      </form>

      <div className="h-8" />
    </div>
  )
}
