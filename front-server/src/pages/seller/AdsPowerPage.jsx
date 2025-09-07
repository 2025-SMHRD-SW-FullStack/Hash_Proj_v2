// /src/pages/seller/AdsPowerPage.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { CATEGORIES } from '../../constants/products'
import { getMyProducts } from '../../service/productService' // 셀러 소유 상품 전용
import { createAdWithImage, fetchAdUnavailableDates, fetchAdInventory } from '../../../src/service/adsService'
import { AD_SLOT_TYPES } from '../../constants/ads'
import { loadTossPayments } from '@tosspayments/payment-sdk'

import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'

const inputCls = 'w-full h-10 rounded-lg border px-3 text-sm box-border max-w-full'
const box = 'rounded-xl border bg-white p-4 shadow-sm'
const Field = ({ label, children, hint, required = false }) => (
  <label className="relative mb-3 block">
    <div className="mb-1 text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </div>
    {children}
    {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
  </label>
)

// UI 라벨 ↔ 백엔드 enum 매핑
const POSITIONS = [
  { key: 'mainBanner',    label: '메인 롤링 배너',     type: AD_SLOT_TYPES.MAIN_ROLLING,  capacity: 10, price: { 7: 15000, 14: 25000, 30: 45000 }, requiresImage: true, requiresCategory: true },
  { key: 'mainRight',     label: '메인 오른쪽 구좌',   type: AD_SLOT_TYPES.MAIN_SIDE,     capacity: 3,  price: { 7: 12000, 14: 20000, 30: 40000 }, requiresImage: true, requiresCategory: true },
  { key: 'productList',   label: '상품목록 (파워광고)', type: AD_SLOT_TYPES.CATEGORY_TOP,  capacity: 5,  price: { 7: 8000,  14: 15000, 30: 30000 }, requiresImage: false, requiresCategory: true },
  { key: 'orderComplete', label: '주문완료',           type: AD_SLOT_TYPES.ORDER_COMPLETE, capacity: 5,  price: { 7: 5000,  14: 10000, 30: 20000 }, requiresImage: true, requiresCategory: false },
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
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    productId: '',
    position: 'mainBanner',
    period: 7,
    startDate: '',
    endDate: '',
    title: '',
    description: '',
    agree: false,
  })
  const [category, setCategory] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')

  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState([])     // 내 상품 목록
  const [unavailableSet, setUnavailableSet] = useState(new Set()) // 'YYYY-MM-DD' Set

  const positionConf = useMemo(() => POSITIONS.find((p) => p.key === form.position) || POSITIONS[0], [form.position])
  const price = positionConf?.price?.[form.period] || 0

  // ---- DayPicker 범위 & 선택 불가 세트
  const today = useMemo(() => new Date(), [])
  const calendarFrom = today
  const calendarTo = useMemo(() => addDaysDate(today, 90), [today])

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
    // 광고 타입별로 필요한 조건 확인
    const needsCategory = positionConf.requiresCategory
    if (needsCategory && !category) {
      setUnavailableSet(new Set())
      return
    }
    
    ;(async () => {
      try {
        setLoading(true)
        const set = await fetchAdUnavailableDates({
          type: positionConf.type,
          category: needsCategory ? category : undefined,
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
  }, [positionConf.type, positionConf.requiresCategory, category])

  const on = (k) => (e) => {
    const v = e.target.value
    setForm((s) => {
      const next = { ...s, [k]: v }
      if (k === 'period' || k === 'startDate') {
        const days = Number(k === 'period' ? v : next.period || 0)
        if (next.startDate) {
          next.endDate = addDaysStr(next.startDate, days)
        }
      }
      return next
    })
  }

  // 이미지 파일 선택 처리
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 파일 크기는 5MB 이하여야 합니다.')
      return
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택할 수 있습니다.')
      return
    }

    setImageFile(file)
    
    // 미리보기 생성
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)
  }

  // 이미지 제거
  const removeImage = () => {
    setImageFile(null)
    setImagePreview('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const productOptions = useMemo(() => {
    return products.map((p) => ({ id: p.id, name: truncate10(p.name) }))
  }, [products])

  const canSubmit = useMemo(() => {
    // 기본 필수값 체크
    const baseRequired = form.position && form.period && form.startDate && form.endDate && form.agree
    
    // 카테고리가 필요한 광고 타입인 경우 카테고리와 상품 필수
    if (positionConf.requiresCategory) {
      if (!category || !form.productId) return false
    }
    
    // 이미지가 필요한 광고 타입인 경우 이미지 필수
    if (positionConf.requiresImage && !imageFile) {
      return false
    }
    
    return baseRequired
  }, [category, form, positionConf.requiresImage, positionConf.requiresCategory, imageFile])

  // 시작일 비활성 판정: 선택한 period 동안 하루라도 막힌 날이 있으면 해당 시작일은 비활성
  const isStartDisabled = (dateObj) => {
    if (!dateObj) return true
    
    // 카테고리가 필요한 광고 타입인데 카테고리가 없으면 비활성
    if (positionConf.requiresCategory && !category) return true

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
    if (positionConf.requiresCategory && !category) {
      alert('카테고리를 먼저 선택하세요.')
      return
    }
    if (!form.startDate || !form.endDate) {
      alert('기간을 먼저 선택하세요.')
      return
    }
    
    try {
      setLoading(true)
      const res = await fetchAdInventory({
        type: positionConf.type,
        category: positionConf.requiresCategory ? category : undefined,
        startDate: form.startDate,
        endDate: form.endDate,
      })
      // setInventory(res || []) // 가데이터 제거
      const available = (res || []).find((d) => d.available)
      alert(available ? `가용 슬롯 있음 (slotId=${available.slotId})` : '가용 슬롯이 없습니다.')
    } catch (e) {
      console.error(e)
      alert('인벤토리 조회 실패')
    } finally {
      setLoading(false)
    }
  }

  // ✅ 신청하기: 이미지 업로드 + 인벤토리 재조회 → 첫 가용 슬롯으로 예약 생성
  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) {
      alert('필수값을 모두 입력해 주세요.')
      return
    }

    try {
      setLoading(true)
      
      // 광고 생성 (이미지 업로드 포함)
      const adResult = await createAdWithImage({
        type: positionConf.type,
        category: positionConf.requiresCategory ? category : undefined,
        productId: Number(form.productId),
        startDate: form.startDate,
        endDate: form.endDate,
        imageFile: positionConf.requiresImage ? imageFile : null,
        title: form.title || undefined,
        description: form.description || undefined,
      })

      const finalPrice = adResult?.price ?? price
      const clientKey = (import.meta.env.VITE_TOSS_CLIENT_KEY || '').trim()
      if (!clientKey) {
        alert('예약이 생성되었지만 결제 클라이언트 키가 없습니다. 관리자에게 문의하세요.')
        return
      }

      const orderId = `ad-${adResult.bookingId}-${Date.now()}`
      const toss = await loadTossPayments(clientKey)
      await toss.requestPayment('카드', {
        orderId,
        orderName: '파워광고 결제',
        amount: Number(finalPrice),
        successUrl: `${window.location.origin}/seller/ads/pay/complete?bookingId=${encodeURIComponent(adResult.bookingId)}&orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(finalPrice)}`,
        failUrl: `${window.location.origin}/seller/ads/pay/complete?status=fail&bookingId=${encodeURIComponent(adResult.bookingId)}`,
      })

    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.message || e.message || '광고 신청 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">파워 광고 신청</h1>

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* 좌측 – 입력 */}
        <section className={`${box} lg:mb-0`}>
          {/* 카테고리 선택 - 카테고리가 필요한 광고 타입일 때만 표시 */}
          {positionConf.requiresCategory && (
            <Field label="카테고리" required>
              <select value={category} onChange={(e)=>setCategory(e.target.value)} className={inputCls}>
                <option value="">카테고리를 선택하세요</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          )}

          {/* 상품 선택 - 카테고리가 필요한 광고 타입일 때만 표시 */}
          {positionConf.requiresCategory && (
            <Field label="상품 선택" hint="표시는 최대 10글자" required>
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
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="광고 위치" hint="동시 노출 가능 개수는 표 참고" required>
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

            <Field label="광고 기간" required>
              <select value={form.period} onChange={on('period')} className={inputCls}>
                {PERIODS.map((d) => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </Field>

            {/* ✅ 달력: 불가일은 아예 선택 비활성 */}
            <Field label="시작일" required>
              <div className="rounded-lg border p-2">
                <DayPicker
                  mode="single"
                  captionLayout="dropdown"
                  fromDate={calendarFrom}
                  toDate={calendarTo}
                  selected={form.startDate ? new Date(form.startDate) : undefined}
                  onDayClick={(d) => {
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

          {/* 이미지 업로드 - 이미지가 필요한 광고 타입일 때만 표시 */}
          {positionConf.requiresImage && (
            <Field label="이미지" hint="5MB 이하, JPG/PNG/GIF 파일" required>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sub/30 file:text-[#AC6FDB] hover:file:bg-sub hover:file:text-[#8950B4]"
                />
                
                {imagePreview && (
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="미리보기" 
                      className="max-w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </Field>
          )}

          {/* 광고 제목과 설명 */}
          <div className="grid grid-cols-1 gap-3">
            <Field label="광고 제목" hint="선택사항">
              <input
                type="text"
                value={form.title}
                onChange={on('title')}
                className={inputCls}
                placeholder="광고 제목을 입력하세요"
                maxLength={50}
              />
            </Field>
            
            <Field label="광고 설명" hint="선택사항">
              <textarea
                value={form.description}
                onChange={on('description')}
                className={`${inputCls} h-20 resize-none`}
                placeholder="광고 설명을 입력하세요"
                maxLength={200}
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
                required
              />
              광고 운영 정책 및 결제에 동의합니다.
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="unselected" onClick={() => navigate('/seller/ads/management')}>
                취소
              </Button>
              <Button variant='admin' type="submit" disabled={loading || !canSubmit}>신청하기</Button>
            </div>
          </div>
        </section>

        {/* 우측 – 요약 (데스크탑 우측, 모바일에서는 아래로) */}
        <aside className={`${box}`}>
          <h2 className="mb-2 text-base font-semibold">신청 요약</h2>
          <ul className="space-y-1 text-sm pl-0">
            {positionConf.requiresCategory && (
              <>
                <li className="flex items-center justify-between"><span>카테고리</span><span>{category || '-'}</span></li>
                <li className="flex items-center justify-between"><span>상품</span><span>{(productOptions.find((p)=>String(p.id)===String(form.productId))?.name) || '-'}</span></li>
              </>
            )}
            <li className="flex items-center justify-between"><span>위치</span><span>{positionConf?.label}</span></li>
            <li className="flex items-center justify-between"><span>기간</span><span>{form.period}일</span></li>
            <li className="flex items-center justify-between"><span>시작일</span><span>{form.startDate || '-'}</span></li>
            <li className="flex items-center justify-between"><span>종료일</span><span>{form.endDate || '-'}</span></li>
            {positionConf.requiresImage && (
              <li className="flex items-center justify-between"><span>이미지</span><span>{imageFile ? '선택됨' : '미선택'}</span></li>
            )}
            <li className="flex items-center justify-between font-semibold"><span>결제 예정 금액</span><span className="tabular-nums">{fmt(price)}원</span></li>
          </ul>

          <hr className="my-4" />

          <h3 className="mb-1 text-sm font-medium text-gray-700">동시 노출 가능 개수</h3>
          <ul className="space-y-1 text-sm pl-0">
            {POSITIONS.map((p) => (
              <li key={p.key} className="flex items-center justify-between">
                <span>{p.label}</span>
                <span className="tabular-nums">{p.capacity}개</span>
              </li>
            ))}
          </ul>

          {/* (디버그) 최근 인벤토리 확인 결과 */}
          {/* {!!inventory?.length && ( // 가데이터 제거
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
          )} */}
        </aside>
      </form>

      <div className="h-8" />
    </div>
  )
}
