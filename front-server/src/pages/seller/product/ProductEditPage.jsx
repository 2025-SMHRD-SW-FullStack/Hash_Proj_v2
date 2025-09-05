// /src/pages/seller/product/ProductEditPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Button from '../../../components/common/Button'
import FieldRow from '../../../components/seller/product/form/FieldRow'
import DiscountRow from '../../../components/seller/product/form/DiscountRow'
import DetailComposer from '../../../components/seller/product/DetailComposer'
import OptionSection from '../../../components/seller/product/options/OptionSection'
import { CATEGORIES } from '../../../constants/products'
import { uploadImages } from '../../../service/uploadService'


// 실서버 API
import { getMyProductDetail, updateMyProduct } from '../../../service/productService'

const sheet = 'w-full rounded-2xl border bg-white shadow-sm divide-y'
const pad = 'px-6 py-6'
const wrap = 'mx-auto w-full '

// 폭 통일 (등록 페이지와 동일)
const longW = 'w-full max-w-[750px]'
const longW2 = 'w-full max-w-[721px]'
const shortW = 'w-[224px]'

// "옵션 값"이 실제로 있는 variant 인지(단일 SKU의 빈 variants 제외 기준)
const hasOptionVariant = (v = {}) => {
  const vals = [
    v.option1Value ?? v.optionValue, // 서버가 optionValue만 주는 케이스 겸용
    v.option2Value,
    v.option3Value,
    v.option4Value,
    v.option5Value,
  ]
  return vals.some((x) => x !== undefined && x !== null && String(x).trim() !== '')
}

// blocks ⇄ html
function blocksToHtml(blocks = []) {
  return blocks
    .map((b) => {
      if (b.type === 'image') {
        return `<img src="${b.src || ''}" alt="${b.name || ''}" style="max-width:100%;height:auto;display:block;margin:8px 0;" />`
      }
      if (b.text?.trim()) {
        const esc = (s) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return b.text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line)
          .map((line) => `<p>${esc(line)}</p>`)
          .join('')
      }
      return ''
    })
    .join('')
}

function htmlToBlocks(html = '') {
  const out = []
  const div = document.createElement('div')
  div.innerHTML = html || ''
  Array.from(div.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') {
      out.push({
        type: 'image',
        src: node.getAttribute('src') || '',
        name: node.getAttribute('alt') || '',
      })
      return
    }
    const textContent = (node.textContent || '').trim()
    if (textContent) {
      const last = out[out.length - 1]
      if (last && last.type === 'text') last.text += '\n' + textContent
      else out.push({ type: 'text', text: textContent })
    } else if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.textContent || ''
      if (txt.trim()) out.push({ type: 'text', text: txt })
    }
  })
  return out
}

// 상세이미지 업로드 후 블록 내 src를 S3 URL로 치환 (New 페이지와 동일한 전략)
const extractAndUploadDetailImages = async (blocks = []) => {
  const imageBlocks = blocks.filter((b) => b.type === 'image')
  const uploadedBlocks = [...blocks]
  for (const block of imageBlocks) {
    if (block.file) {
      const uploaded = await uploadImages('PRODUCT_CONTENT', [block.file])
      if (uploaded?.[0]?.url) {
        const idx = uploadedBlocks.findIndex((b) => b === block)
        if (idx !== -1)
          uploadedBlocks[idx] = { ...block, src: uploaded[0].url, file: undefined }
      }
      continue
    }
    if (block.src && block.src.startsWith('blob:')) {
      const resp = await fetch(block.src)
      const blob = await resp.blob()
      const file = new File([blob], block.name || 'image.jpg', { type: blob.type })
      const uploaded = await uploadImages('PRODUCT_CONTENT', [file])
      if (uploaded?.[0]?.url) {
        const idx = uploadedBlocks.findIndex((b) => b === block)
        if (idx !== -1) uploadedBlocks[idx] = { ...block, src: uploaded[0].url }
      }
    }
  }
  return uploadedBlocks
}

// 날짜 포맷 헬퍼 (백엔드: LocalDateTime "yyyy-MM-dd'T'HH:mm:ss")
const toIsoStart = (d) => (d ? `${d}T00:00:00` : null)
const toIsoEnd = (d) => (d ? `${d}T23:59:59` : null)

/** 서버 응답 → OptionSection.initial 매핑 */
const buildOptionInitial = ({ product, variants }) => {
  const optionNames = [
    product?.option1Name,
    product?.option2Name,
    product?.option3Name,
    product?.option4Name,
    product?.option5Name,
  ].filter(Boolean)

  // 옵션이 없으면 null 반환
  const anyHas = Array.isArray(variants) && variants.some(hasOptionVariant)
  if (!anyHas) {
    return {
      enabled: false,
      composeType: 'single',
      nameCount: 1,
      groups: [{ name: optionNames[0] || '옵션1', values: [] }],
      rows: [],
    }
  }

  // 실제 사용하는 깊이
  const depth = Math.max(
    ...variants.map((v) => {
      let d = 0
      for (let i = 1; i <= 5; i++)
        if (v[`option${i}Value`] ?? (i === 1 ? v.optionValue : undefined)) d = i
      return d
    }),
    optionNames.length || 0
  )

  const names = Array.from({ length: depth }).map(
    (_, i) => optionNames[i] || `옵션${i + 1}`
  )

  // 각 단의 값 모으기
  const valueSets = Array.from({ length: depth }).map(() => new Set())
  variants.forEach((v) => {
    for (let i = 1; i <= depth; i++) {
      const val = v[`option${i}Value`] ?? (i === 1 ? v.optionValue : undefined)
      if (val != null && String(val).trim() !== '') valueSets[i - 1].add(String(val))
    }
  })

  const groups = valueSets.map((s, i) => ({
    name: names[i],
    values: Array.from(s), // OptionSection에서 join(', ') 처리
  }))

  const rows = variants.map((v) => {
    const parts = Array.from({ length: depth }).map((_, i) => ({
      n: names[i],
      v: String(v[`option${i + 1}Value`] ?? (i === 0 ? v.optionValue : '')),
    }))
    return {
      key: parts.map((p) => `${p.n}:${p.v}`).join('|'),
      label: parts.map((p) => p.v).join(' / '),
      parts,
      addPrice: v.addPrice ?? 0,
      stock: v.stock ?? 0,
      enabled: true,
    }
  })

  return {
    enabled: true,
    composeType: depth === 1 ? 'single' : 'combo',
    nameCount: depth,
    groups,
    rows,
  }
}

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
    thumbnail: null, // (UI 유지) 파일 입력 — 서버에는 기존 URL 유지 전달
    // 상세
    detailBlocks: [],
  })

  // 서버에서 받은 원본 값(썸네일 URL/기간 등 유지용)
  const serverSnapshotRef = useRef({
    thumbnailUrl: '',
    optionNames: [], // ['색상','사이즈',...]
    saleStartAt: '',
    saleEndAt: '',
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

  // 옵션 초기값(서버 → OptionSection.hydrate)
  const [optionInitial, setOptionInitial] = useState(null)

  // 상세 로드 (실서버)
  useEffect(() => {
    let alive = true
      ; (async () => {
        try {
          setLoading(true)

          const { product, variants } = await getMyProductDetail(id)

          // 기본/가격 매핑
          const basePrice = Number(product?.basePrice ?? product?.price ?? 0)
          const salePrice = Number(product?.salePrice ?? 0)
          const discountEnabled = salePrice > 0 && salePrice <= basePrice
          const discount = discountEnabled ? String(basePrice - salePrice) : ''

          // 판매기간/포인트
          const saleStart = (product?.saleStartAt || '').slice(0, 10)
          const saleEnd = (product?.saleEndAt || '').slice(0, 10)
          const feedbackPoint = String(product?.feedbackPoint ?? 0)

          // 재고
          const stockTotal = String(product?.stockTotal ?? '')

          // 상세 blocks
          const detailBlocks = htmlToBlocks(product?.detailHtml || '')

          // 옵션 라벨(스냅샷 보관)
          const optionNames = [
            product?.option1Name,
            product?.option2Name,
            product?.option3Name,
            product?.option4Name,
            product?.option5Name,
          ].filter(Boolean)
          serverSnapshotRef.current.thumbnailUrl = product?.thumbnailUrl || ''
          serverSnapshotRef.current.optionNames = optionNames
          serverSnapshotRef.current.saleStartAt = product?.saleStartAt || ''
          serverSnapshotRef.current.saleEndAt = product?.saleEndAt || ''

          // ✅ OptionSection 초기 구성
          const built = buildOptionInitial({ product, variants })
          setOptionInitial(built)
          if (!alive) return
          setForm({
            category: product?.category || '',
            brand: product?.brand || '',
            name: product?.name || '',
            price: String(basePrice || ''),
            discountEnabled,
            discountType: 'amount',
            discount,
            saleStart,
            saleEnd,
            feedbackPoint,
            stock: stockTotal,
            useOptions: !!(built && built.rows && built.rows.length),
            optionGroups: [], // OptionSection에서 갱신
            options: [], // OptionSection에서 갱신
            thumbnail: null, // 파일은 UI 유지(서버엔 기존 URL 유지)
            detailBlocks,
          })
        } finally {
          if (alive) setLoading(false)
        }
      })()
    return () => {
      alive = false
    }
  }, [id])

  // 저장(등록 페이지와 동일 UX, 단 읽기전용 필드는 그대로 유지)
  const validateAndSubmit = async (e) => {
    e.preventDefault()

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
        if (!Number.isFinite(r.addPrice ?? 0)) {
          return alert('옵션 추가금을 올바르게 입력하세요.')
        }
      }
    }

    if (!form.detailBlocks?.length) {
      return alert('상세페이지 내용을 입력하세요.')
    }

    // --- 서버 페이로드 매핑 (스웨거 기준) ---
    const basePrice = pNum
    const salePrice = form.discountEnabled
      ? Math.max(0, basePrice - Number(form.discount || 0))
      : 0

    // ✅ 상세 블록 내 이미지들을 먼저 업로드/치환 (blob/File → S3 URL)
    const detailBlocksUploaded = await extractAndUploadDetailImages(
      form.detailBlocks || []
    )

    // 옵션 라벨(OptionSection 제공 groups 우선, 서버 스냅샷 보조)
    const names = (form.optionGroups || [])
      .map((g) => g.name?.trim())
      .filter(Boolean)
    const optNames = []
    for (let i = 0; i < 5; i++)
      optNames[i] = names[i] || serverSnapshotRef.current.optionNames[i] || null

    const variants = form.useOptions
      ? (form.options || []).map((r) => {
        const v = {
          addPrice: Number(r.addPrice ?? 0),
          stock: Number(r.stock ?? 0),
        }
          ; (r.parts || []).forEach((p, idx) => {
            v[`option${idx + 1}Value`] = p.v
          })
        return v
      })
      : []

    const payload = {
      name: form.name,
      brand: form.brand,
      category: form.category,
      basePrice,
      salePrice,
      thumbnailUrl: serverSnapshotRef.current.thumbnailUrl || '',
      detailHtml: blocksToHtml(detailBlocksUploaded),
      // 백엔드가 LocalDateTime(yyyy-MM-dd'T'HH:mm:ss) 요구
      saleStartAt: serverSnapshotRef.current.saleStartAt || toIsoStart(form.saleStart),
      saleEndAt: serverSnapshotRef.current.saleEndAt || toIsoEnd(form.saleEnd),
      feedbackPoint: Number(form.feedbackPoint || 0),

      option1Name: optNames[0],
      option2Name: optNames[1],
      option3Name: optNames[2],
      option4Name: optNames[3],
      option5Name: optNames[4],
      variants,
      // 옵션이 없으면 서버 단일 SKU 생성 시 사용할 총 재고 전달
      ...(form.useOptions ? {} : { stockTotal: Number(form.stock || 0) }),
    }

    try {
      await updateMyProduct(id, payload)
      alert('수정 저장 완료')
      navigate('/seller/products?status=ALL')
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.message || err?.message || '상품 수정 실패'
      alert(msg)
    }
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
                    onChange={() => { }}
                    disabled
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
                  onChange={() => { }}
                  disabled
                />
              </FieldRow>

              <FieldRow label="판매 종료일" required>
                <input
                  type="date"
                  className={`${shortW} h-10 rounded-lg border px-3 text-sm bg-gray-100 cursor-not-allowed`}
                  value={form.saleEnd}
                  onChange={() => { }}
                  disabled
                />
              </FieldRow>

              <FieldRow label="피드백 포인트(원)" required>
                <input
                  type="number"
                  inputMode="numeric"
                  className={`${shortW} rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed`}
                  value={form.feedbackPoint}
                  onChange={() => { }}
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
              initial={optionInitial}
              onChange={({ enabled, groups, rows }) => {
                setField('useOptions', enabled)
                setField('optionGroups', groups)
                setField('options', rows)
              }}
            />
          </section>

          {/* 미디어 (UI 유지 – 파일 입력) */}
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
} ``
