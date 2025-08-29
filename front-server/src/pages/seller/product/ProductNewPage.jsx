import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../../components/common/Button'
import FieldRow from '../../../components/seller/product/form/FieldRow'
import DiscountRow from '../../../components/seller/product/form/DiscountRow'
import DetailComposer from '../../../components/seller/product/DetailComposer'
import { CATEGORIES } from '../../../constants/products'
import OptionSection from '../../../components/seller/product/options/OptionSection'

const sheet = 'w-full rounded-2xl border bg-white shadow-sm divide-y'
const pad = 'px-6 py-6'
const wrap = 'mx-auto w-full max-w-[1120px] px-6'

// 폭 통일
const longW = 'w-full max-w-[750px]'  // 카테고리
const longW2 = 'w-full max-w-[721px]' // 브랜드/상품명
const shortW = 'w-[224px]'            // 판매가/날짜/포인트/재고

export default function ProductNewPage() {
  const navigate = useNavigate()

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
    options: [], // [{key,label,delta,stock}]
    // 미디어
    thumbnail: null,
    // 상세(HTML 미사용)
    detailBlocks: [],
  })

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }))
  const on = (k) => (e) => setField(k, e.target.value)
  const onNum = (k) => (e) => setField(k, e.target.value.replace(/[^\d]/g, ''))

  const price = Number(form.price || 0)
  const off = useMemo(() => {
    if (!form.discountEnabled || !price) return 0
    const v = Number(form.discount || 0) // 금액형만 사용
    return Math.max(0, v)
  }, [form.discountEnabled, form.discount, price])

  const final = Math.max(0, price - off)

  const validateAndSubmit = (e) => {
    e.preventDefault()

    if (!form.category || !CATEGORIES.includes(form.category)) {
      return alert('카테고리를 선택하세요.')
    }
    if (!form.brand.trim()) return alert('브랜드명을 입력하세요.')
    if (!form.name.trim()) return alert('상품명을 입력하세요.')
    if (!price || price <= 0) return alert('판매가를 입력하세요.')

    if (!form.saleStart || !form.saleEnd) return alert('판매기간을 선택하세요.')
    if (form.saleEnd < form.saleStart) return alert('판매 종료일은 시작일 이후여야 합니다.')

    const fb = Number(form.feedbackPoint)
    if (!Number.isFinite(fb)) return alert('피드백 포인트를 입력하세요.')

    // 재고 / 옵션 (옵션은 필수 아님)
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
        if (!Number.isFinite(r.delta)) {
          return alert('옵션 추가금을 올바르게 입력하세요.')
        }
      }
      // 옵션 0개도 허용
    }

    // 상세페이지(블록만)
    if (!form.detailBlocks?.length) {
      return alert('상세페이지 내용을 입력하세요.')
    }

    const payload = {
      ...form,
      price,
      discount: Number(form.discount || 0),
      finalPrice: final,
      files: { thumbnail: form.thumbnail?.name },
      stock: form.useOptions ? undefined : Number(form.stock || 0),
      options: form.useOptions ? form.options : [],
      // detailBlocks 그대로 전송
    }

    console.log('[상품 등록 payload]', payload)
    alert('임시: 상품이 등록되었다고 가정합니다.')
    navigate('/seller/products')
  }

  return (
    <div className="w-full min-w-0">
      <div className={wrap}>
        <h1 className="mb-4 text-xl font-bold">상품 등록</h1>

        <form onSubmit={validateAndSubmit} className={sheet}>
          {/* 기본 정보 */}
          <section className={pad}>
            <div className="space-y-4">
              <FieldRow label="카테고리" required>
                <div className={longW}>
                  <select
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                    value={form.category}
                    onChange={on('category')}
                  >
                    <option value="">선택</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
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

          {/* 즉시할인 */}
          <section className={pad}>
            <DiscountRow form={form} setField={setField} />
          </section>

          {/* 판매기간 · 포인트 · 재고 */}
          <section className={pad}>
            <div className="space-y-4">
              <FieldRow label="판매 시작일" required>
                <input
                  type="date"
                  className={`${shortW} h-10 rounded-lg border px-3 text-sm`}
                  value={form.saleStart}
                  onChange={on('saleStart')}
                />
              </FieldRow>

              <FieldRow label="판매 종료일" required>
                <input
                  type="date"
                  className={`${shortW} h-10 rounded-lg border px-3 text-sm`}
                  value={form.saleEnd}
                  onChange={on('saleEnd')}
                />
              </FieldRow>

              <FieldRow label="피드백 포인트(원)" required>
                <input
                  type="number"
                  inputMode="numeric"
                  className={`${shortW} rounded-lg border px-3 py-2 text-sm`}
                  value={form.feedbackPoint}
                  onChange={onNum('feedbackPoint')}
                />
              </FieldRow>

              <FieldRow label="재고 수량" required>
                <input
                  type="number"
                  inputMode="numeric"
                  className={`${shortW} rounded-lg border px-3 py-2 text-sm`}
                  value={form.stock}
                  onChange={onNum('stock')}
                />
              </FieldRow>
            </div>
          </section>

          {/* 옵션 (필요시 사용) */}
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

          {/* 미디어 */}
          <section className={pad}>
            <div className="space-y-4">
              <FieldRow label="썸네일" required help="이미지 1장 업로드">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setField('thumbnail', e.target.files?.[0] || null)
                  }
                />
              </FieldRow>
            </div>
          </section>

          {/* 상세페이지 내용 */}
          <section className={pad}>
            <FieldRow label="상세페이지 내용" required>
              <div className={longW2}>
                <DetailComposer
                  initialBlocks={form.detailBlocks || []}
                  editorClass="h-60"           // 필요하면 h-72 등으로 조절
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
            <Button type="submit">등록</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
