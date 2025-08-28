import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../../../components/common/Button'
import FieldRow from '../../../components/seller/product/form/FieldRow'
import DiscountRow from '../../../components/seller/product/form/DiscountRow'
import DetailComposer from '../../../components/seller/product/DetailComposer'
import OptionSection from '../../../components/seller/product/options/OptionSection'
import { CATEGORIES } from '../../../constants/products'

// 더미(목록형) 시드
import { productsMock as LIST_SEED } from '../../../data/products.mock.js'

const sheet = 'w-full rounded-2xl border bg-white shadow-sm divide-y'
const pad = 'px-6 py-6'
const wrap = 'mx-auto w-full max-w-[1120px] px-6'

// 폭 통일 (등록 페이지와 동일)
const longW = 'w-full max-w-[750px]'  // 카테고리
const longW2 = 'w-full max-w-[721px]' // 브랜드/상품명
const shortW = 'w-[224px]'            // 판매가/날짜/포인트/재고

// ─────────────────────────────────────────────
// In-memory Mock "API" (시드=파일, 저장=localStorage)
const LS_KEY = 'mock_products_v1'
const delay = (ms = 120) => new Promise(r => setTimeout(r, ms))

/** 목록용 → 상세형으로 수화 */
function toDetailSeed(row) {
  const saleStart = row.updatedAt || '2025-08-01'
  const saleEnd = row.saleEndAt || '2025-12-31'
  return {
    id: row.id,
    // 기본
    category: row.category || '',
    brand: '', // 목록 데이터에 없으니 기본값
    name: row.name || '',
    price: Number(row.price ?? 0),

    // 즉시할인(기본 비활성)
    discountEnabled: false,
    discountType: 'amount',
    discount: 0,

    // 판매기간/포인트
    saleStart,
    saleEnd,
    feedbackPoint: 0,

    // 재고/옵션
    stock: Number(row.stock ?? 0),
    useOptions: false,
    optionGroups: [],
    options: [],

    // 미디어/상세(간단 플레이스홀더)
    thumbnailUrl: `https://via.placeholder.com/160?text=${encodeURIComponent(row.name ?? '상품')}`,
    detailBlocks: [{ type: 'text', text: `${row.name} 상세 설명(더미).` }],
  }
}
function seedDB() {
  return (LIST_SEED || []).map(toDetailSeed)
}
function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  const seeded = seedDB()
  localStorage.setItem(LS_KEY, JSON.stringify(seeded))
  return seeded
}
function saveDB(db) {
  localStorage.setItem(LS_KEY, JSON.stringify(db))
}
async function getProductMock(id) {
  await delay()
  const db = loadDB()
  const p = db.find(x => String(x.id) === String(id))
  if (!p) throw new Error('NOT_FOUND')
  return structuredClone(p)
}
async function updateProductMock(id, patch) {
  await delay()
  const db = loadDB()
  const i = db.findIndex(x => String(x.id) === String(id))
  if (i < 0) throw new Error('NOT_FOUND')
  db[i] = { ...db[i], ...patch }
  saveDB(db)
  return structuredClone(db[i])
}
// ─────────────────────────────────────────────

export default function ProductEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    // 기본
    category: '', brand: '', name: '', price: '',
    // 즉시할인
    discountEnabled: false, discountType: 'amount', discount: '',
    // 판매기간/포인트
    saleStart: '', saleEnd: '', feedbackPoint: '',
    // 재고
    stock: '',
    // 옵션
    useOptions: false,
    optionGroups: [],
    options: [], // [{key,label,parts,addPrice,stock,enabled}]
    // 미디어
    thumbnail: null, // 파일 입력(교체용)
    // 상세
    detailBlocks: [],
  })

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }))
  const on = (k) => (e) => setField(k, e.target.value)
  const onNum = (k) => (e) => setField(k, e.target.value.replace(/[^\d]/g, ''))

  // 가격/할인 계산
  const price = Number(form.price || 0)
  const off = useMemo(() => {
    if (!form.discountEnabled || !price) return 0
    const v = Number(form.discount || 0)
    return Math.max(0, Math.min(v, price))
  }, [form.discountEnabled, form.discount, price])
  const final = Math.max(0, price - off)

  // 상세 로드 (한 번)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const p = await getProductMock(id)

        // 편집 폼에 맞게 매핑
        const next = {
          category: p.category || '',
          brand: p.brand || '',
          name: p.name || '',
          price: String(p.price ?? ''),
          discountEnabled: !!p.discountEnabled,
          discountType: 'amount',
          discount: String(p.discount ?? ''),
          saleStart: (p.saleStart || '').slice(0, 10),
          saleEnd: (p.saleEnd || '').slice(0, 10),
          feedbackPoint: String(p.feedbackPoint ?? 0),
          stock: String(p.stock ?? ''),
          useOptions: !!p.useOptions,
          optionGroups: p.optionGroups || [],
          options: p.options || [],
          thumbnail: null, // 파일은 보안상 프리필 불가
          detailBlocks: p.detailBlocks || [],
        }
        if (!alive) return
        setForm(next)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [id])

  // 저장(등록 페이지와 동일 UX, 단 읽기전용 필드는 그대로 유지)
  const validateAndSubmit = async (e) => {
    e.preventDefault()

    // 등록 페이지와 동일 검증(읽기전용은 이미 값 세팅되어 있음)
    if (!form.category || !CATEGORIES.includes(form.category)) {
      return alert('카테고리를 선택하세요.')
    }
    if (!form.brand.trim()) return alert('브랜드명을 입력하세요.')
    if (!form.name.trim()) return alert('상품명을 입력하세요.')

    const pNum = Number(form.price || 0)
    if (!pNum || pNum <= 0) return alert('판매가를 입력하세요.')

    if (!form.saleStart || !form.saleEnd) return alert('판매기간을 선택하세요.')
    if (form.saleEnd < form.saleStart) return alert('판매 종료일은 시작일 이후여야 합니다.')

    const fb = Number(form.feedbackPoint)
    if (!Number.isFinite(fb)) return alert('피드백 포인트를 입력하세요.')

    if (!form.useOptions) {
      const stock = Number(form.stock)
      if (!Number.isFinite(stock) || stock <= 0) {
        return alert('수량(재고)을 올바르게 입력하세요.')
      }
    } else {
      for (const r of form.options ?? []) {
        if (!Number.isFinite(r.stock) || r.stock < 0) {
          return alert('옵션 재고를 올바르게 입력하세요.')
        }
        if (!Number.isFinite(r.addPrice ?? r.delta ?? 0)) {
          return alert('옵션 추가금을 올바르게 입력하세요.')
        }
      }
    }

    if (!form.detailBlocks?.length) {
      return alert('상세페이지 내용을 입력하세요.')
    }

    const payload = {
      // 읽기전용도 포함해 전체 병합 저장(백엔드가 머지한다고 가정)
      category: form.category,
      brand: form.brand,
      name: form.name,
      price: pNum,

      discountEnabled: form.discountEnabled,
      discountType: 'amount',
      discount: Number(form.discount || 0),
      finalPrice: final,

      saleStart: form.saleStart,
      saleEnd: form.saleEnd,
      feedbackPoint: Number(form.feedbackPoint || 0),

      stock: form.useOptions ? undefined : Number(form.stock || 0),

      useOptions: form.useOptions,
      optionGroups: form.optionGroups,
      options: form.useOptions ? form.options : [],

      // 파일 업로드는 더미라서 파일명만 보관
      files: form.thumbnail ? { thumbnail: form.thumbnail.name } : undefined,

      detailBlocks: form.detailBlocks,
    }

    await updateProductMock(id, payload)
    alert('수정 저장 완료(모크)')
    navigate('/seller/products')
  }

  if (loading) {
    return (
      <div className="w-full min-w-0">
        <div className={wrap}>
          <p className="py-16 text-center text-gray-500">불러오는 중…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0">
      <div className={wrap}>
        <h1 className="mb-4 text-xl font-bold">상품 수정</h1>

        <form onSubmit={validateAndSubmit} className={sheet}>
          {/* 기본 정보 (카테고리는 읽기전용) */}
          <section className={pad}>
            <div className="space-y-4">
              <FieldRow label="카테고리" required>
                <div className={longW}>
                  <select
                    className="h-10 w-full rounded-lg border px-3 text-sm bg-gray-100 cursor-not-allowed"
                    value={form.category}
                    onChange={() => {}}
                    disabled
                  >
                    <option value="">선택</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </FieldRow>

              <FieldRow label="브랜드명" required>
                <div className={longW2}>
                  <input
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    value={form.brand}
                    onChange={on('brand')}
                  />
                </div>
              </FieldRow>

              <FieldRow label="상품명" required>
                <div className={longW2}>
                  <input
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    value={form.name}
                    onChange={on('name')}
                  />
                </div>
              </FieldRow>

              <FieldRow
                label="판매가(원)"
                required
                help={`할인 적용 시 최종가: ${final.toLocaleString('ko-KR')}원`}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  className={`${shortW} rounded-lg border px-3 py-2 text-sm`}
                  value={form.price}
                  onChange={onNum('price')}
                />
              </FieldRow>
            </div>
          </section>

          {/* 즉시할인 (수정 가능) */}
          <section className={pad}>
            <DiscountRow form={form} setField={setField} />
          </section>

          {/* 판매기간 · 포인트 · 재고 (기간/포인트 읽기전용, 수량만 수정) */}
          <section className={pad}>
            <div className="space-y-4">
              <FieldRow label="판매 시작일" required>
                <input
                  type="date"
                  className={`${shortW} h-10 rounded-lg border px-3 text-sm bg-gray-100 cursor-not-allowed`}
                  value={form.saleStart}
                  onChange={() => {}}
                  disabled
                />
              </FieldRow>

              <FieldRow label="판매 종료일" required>
                <input
                  type="date"
                  className={`${shortW} h-10 rounded-lg border px-3 text-sm bg-gray-100 cursor-not-allowed`}
                  value={form.saleEnd}
                  onChange={() => {}}
                  disabled
                />
              </FieldRow>

              <FieldRow label="피드백 포인트(원)" required>
                <input
                  type="number"
                  inputMode="numeric"
                  className={`${shortW} rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed`}
                  value={form.feedbackPoint}
                  onChange={() => {}}
                  disabled
                />
              </FieldRow>

              {/* 수량은 수정 가능 */}
              {!form.useOptions && (
                <FieldRow label="재고 수량" required>
                  <input
                    type="number"
                    inputMode="numeric"
                    className={`${shortW} rounded-lg border px-3 py-2 text-sm`}
                    value={form.stock}
                    onChange={onNum('stock')}
                  />
                </FieldRow>
              )}
            </div>
          </section>

          {/* 옵션 (수정 가능) */}
          <section className={pad}>
            <OptionSection
              enabled={form.useOptions}
              price={Number(form.price || 0)}
              value={form.options}
              onChange={({ enabled, groups, rows }) => {
                setField('useOptions', enabled)
                setField('optionGroups', groups)
                setField('options', rows)
              }}
            />
          </section>

          {/* 미디어 (수정 가능) */}
          <section className={pad}>
            <div className="space-y-4">
              <FieldRow label="썸네일" help="이미지 1장 업로드">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setField('thumbnail', e.target.files?.[0] || null)}
                />
              </FieldRow>
            </div>
          </section>

          {/* 상세페이지 (수정 가능) */}
          <section className={pad}>
            <FieldRow label="상세페이지 내용" required>
              <div className={longW2}>
                <DetailComposer
                  initialBlocks={form.detailBlocks || []}
                  editorClass="h-60"
                  onChange={(blocks) => setField('detailBlocks', blocks)}
                />
              </div>
            </FieldRow>
          </section>

          {/* 액션 */}
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Button type="button" variant="signUp" onClick={() => navigate('/seller/products')}>
              취소
            </Button>
            <Button type="submit">수정 저장</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
