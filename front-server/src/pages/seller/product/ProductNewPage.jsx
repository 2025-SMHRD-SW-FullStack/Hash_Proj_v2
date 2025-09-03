// /src/pages/seller/product/ProductNewPage.jsx
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../../components/common/Button'
import FieldRow from '../../../components/seller/product/form/FieldRow'
import DiscountRow from '../../../components/seller/product/form/DiscountRow'
import DetailComposer from '../../../components/seller/product/DetailComposer'
import { CATEGORIES } from '../../../constants/products'
import OptionSection from '../../../components/seller/product/options/OptionSection'
import { createMyProduct } from '/src/service/productService'
import { uploadImages } from '/src/service/uploadService'

const sheet = 'w-full rounded-2xl border bg-white shadow-sm divide-y'
const pad = 'px-6 py-6'
const wrap = 'mx-auto w-full max-w-[1120px] px-6'

// 폭 통일 (Edit 페이지와 동일)
const longW = 'w-full max-w-[750px]'  // 카테고리
const longW2 = 'w-full max-w-[721px]' // 브랜드/상품명
const shortW = 'w-[224px]'            // 판매가/날짜/포인트/재고

// blocks -> html (서버는 detailHtml 문자열 수신)
function blocksToHtml(blocks = []) {
  return blocks
    .map((b) => {
      if (b.type === 'image') {
        return `<img src="${b.src || ''}" alt="${b.name || ''}" style="max-width:100%;height:auto;display:block;margin:8px 0;" />`
      } else if (b.type === 'text') {
        // 텍스트가 null이거나 빈 문자열이어도 처리
        const text = b.text || ''
        return `<p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
      }
      return ''
    })
    .filter(Boolean) // 빈 문자열 제거
    .join('')
}

// LocalDateTime 변환기: 시작=00:00:00, 종료=23:59:59
const toLdt = (d, isEnd = false) => (d ? `${d}T${isEnd ? '23:59:59' : '00:00:00'}` : null)

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
    options: [], // [{key,label,parts,addPrice,stock,enabled}]
    // 미디어
    thumbnail: null, // UI는 파일, 서버엔 URL만 전송
    // 상세(블록 에디터)
    detailBlocks: [],
  })

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }))
  const on = (k) => (e) => setField(k, e.target.value)
  const onNum = (k) => (e) => setField(k, e.target.value.replace(/[^\d-]/g, ''))

  // 가격/할인 계산 (Edit 페이지와 동일 로직)
  const basePrice = Number(form.price || 0)
  const discountAmt = useMemo(() => {
    if (!form.discountEnabled || !basePrice) return 0
    const v = Number(form.discount || 0)
    return Math.max(0, Math.min(v, basePrice))
  }, [form.discountEnabled, form.discount, basePrice])
  const salePriceCalc = Math.max(0, basePrice - discountAmt)

  // 상세페이지 이미지 파일 추출 및 업로드
  const extractAndUploadDetailImages = async (blocks) => {
    const imageBlocks = blocks.filter(b => b.type === 'image')
    const uploadedBlocks = [...blocks]
    
    for (const block of imageBlocks) {
      // File 객체가 있는 경우 직접 사용, blob URL인 경우에만 변환
      if (block.file) {
        try {
          // File 객체를 직접 사용하여 업로드
          const uploaded = await uploadImages('PRODUCT_CONTENT', [block.file])
          if (uploaded?.[0]?.url) {
            // 업로드된 URL로 블록 업데이트
            const blockIndex = uploadedBlocks.findIndex(b => b === block)
            if (blockIndex !== -1) {
              uploadedBlocks[blockIndex] = {
                ...block,
                src: uploaded[0].url,
                file: undefined // File 객체는 제거 (서버에 전송할 필요 없음)
              }
            }
          }
        } catch (err) {
          console.error('상세페이지 이미지 업로드 실패:', err)
          throw new Error('상세페이지 이미지 업로드에 실패했습니다.')
        }
      } else if (block.src && block.src.startsWith('blob:')) {
        // File 객체가 없는 경우 blob URL을 File로 변환 (기존 로직 유지)
        try {
          const response = await fetch(block.src)
          const blob = await response.blob()
          const file = new File([blob], block.name || 'image.jpg', { type: blob.type })
          
          const uploaded = await uploadImages('PRODUCT_CONTENT', [file])
          if (uploaded?.[0]?.url) {
            const blockIndex = uploadedBlocks.findIndex(b => b === block)
            if (blockIndex !== -1) {
              uploadedBlocks[blockIndex] = {
                ...block,
                src: uploaded[0].url
              }
            }
          }
        } catch (err) {
          console.error('상세페이지 이미지 업로드 실패:', err)
          throw new Error('상세페이지 이미지 업로드에 실패했습니다.')
        }
      }
    }
    
    return uploadedBlocks
  }

  // 검증 + 등록
  const validateAndSubmit = async (e) => {
    e.preventDefault()

    // ── 공통 검증 ───────────────────
    if (!form.category || !CATEGORIES.includes(form.category)) {
      return alert('카테고리를 선택하세요.')
    }
    if (!form.brand.trim()) return alert('브랜드명을 입력하세요.')
    if (!form.name.trim()) return alert('상품명을 입력하세요.')

    if (!basePrice || basePrice <= 0) return alert('판매가를 입력하세요.')

    if (!form.saleStart || !form.saleEnd) return alert('판매기간을 선택하세요.')
    if (form.saleEnd < form.saleStart) return alert('판매 종료일은 시작일 이후여야 합니다.')

    const fb = Number(form.feedbackPoint)
    if (!Number.isFinite(fb)) return alert('피드백 포인트를 입력하세요.')

    // 할인 50~100%(백엔드 기준)
    if (form.discountEnabled) {
      const min = Math.floor(basePrice * 0.5), max = basePrice
      if (!(salePriceCalc >= min && salePriceCalc <= max)) {
        return alert('할인가는 기본가의 50% 이상, 100% 이하만 허용됩니다.')
      }
    }

    // 옵션/재고
    if (!form.useOptions) {
      const stock = Number(form.stock)
      if (!Number.isFinite(stock) || stock <= 0) {
        return alert('수량(재고)을 올바르게 입력하세요.')
      }
    } else {
      // 옵션 추가금 ±50%(기준=할인가>0 ? 할인가 : 기본가)
      const baseForDelta = form.discountEnabled ? salePriceCalc : basePrice
      const range = baseForDelta * 0.5
      for (const r of form.options ?? []) {
        if (!Number.isFinite(r.stock) || r.stock < 0) {
          return alert('옵션 재고를 올바르게 입력하세요.')
        }
        const add = Number(r.addPrice ?? r.delta ?? 0)
        if (!Number.isFinite(add) || add < -range || add > range) {
          return alert('옵션 추가금은 기준가의 ±50% 이내여야 합니다.')
        }
      }
      // 옵션 0개도 허용
    }

    if (!form.detailBlocks?.length) {
      return alert('상세페이지 내용을 입력하세요.')
    }

    // ── 서버 페이로드 매핑 ────────────
    const salePrice = form.discountEnabled ? salePriceCalc : 0

    // 옵션 라벨 (최대 5개)
    const names = (form.optionGroups || []).map((g) => g.name?.trim()).filter(Boolean)
    const optNames = []
    for (let i = 0; i < 5; i++) optNames[i] = names[i] || null

    // variants (option{n}Value 전송)
    const variants = form.useOptions
      ? (form.options || []).map((row) => {
          const v = { addPrice: Number(row.addPrice || 0), stock: Number(row.stock || 0) }
          ;(row.parts || []).forEach((p, idx) => {
            v[`option${idx + 1}Value`] = p.v
          })
          return v
        })
      : []

    // 썸네일 업로드 (파일이 있으면 업로드, 없으면 에러)
    let thumbnailUrl = ''
    if (form.thumbnail) {
      try {
        const uploaded = await uploadImages('PRODUCT_THUMB', [form.thumbnail])
        thumbnailUrl = uploaded?.[0]?.url || ''
      } catch (err) {
        console.error(err)
        return alert('썸네일 업로드에 실패했습니다.')
      }
    } else {
      return alert('썸네일 이미지를 업로드하세요.')
    }

    // 상세페이지 이미지 업로드
    let finalDetailBlocks = form.detailBlocks
    try {
      finalDetailBlocks = await extractAndUploadDetailImages(form.detailBlocks)
    } catch (err) {
      alert(err.message)
      return
    }

    const payload = {
      name: form.name,
      brand: form.brand,
      category: form.category,

      basePrice,
      salePrice,

      thumbnailUrl,
      detailHtml: blocksToHtml(finalDetailBlocks),

      saleStartAt: toLdt(form.saleStart, false),
      saleEndAt:   toLdt(form.saleEnd, true),
      feedbackPoint: Number(form.feedbackPoint || 0),

      // 옵션 라벨(서버가 optionName/option1Name 모두 쓸 수 있어 호환 필드 같이 전송)
      optionName: optNames[0],
      option1Name: optNames[0],
      option2Name: optNames[1],
      option3Name: optNames[2],
      option4Name: optNames[3],
      option5Name: optNames[4],

      variants,

      // 단일 상품 재고
      stockTotal: !form.useOptions ? Number(form.stock || 0) : undefined,
    }

    try {
      await createMyProduct(payload)
      alert('상품이 등록되었습니다.')
      navigate('/seller/products')
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.message || err?.message || '상품 등록 실패'
      alert(msg)
    }
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
                help={`할인 적용 시 최종가: ${salePriceCalc.toLocaleString('ko-KR')}원`}
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

          {/* 즉시할인 (Edit과 동일 컴포넌트) */}
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

              {/* 옵션 미사용일 때만 단일 재고 입력 */}
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

          {/* 옵션 (Edit과 동일 UX) */}
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

          {/* 미디어 (UI 유지; 서버엔 URL로 전송) */}
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
            <Button type="submit">등록</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
