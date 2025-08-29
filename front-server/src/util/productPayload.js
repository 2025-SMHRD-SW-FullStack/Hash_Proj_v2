// /src/util/productPayload.js

/** 날짜 → 서버가 먹는 형태(자정/23:59:59) */
export const toDateTime = (d, end = false) =>
  d ? `${d}T${end ? '23:59:59' : '00:00:00'}` : null

/** DetailComposer 블록 → 매우 단순 HTML (필요하면 고도화) */
export const blocksToHtml = (blocks) => {
  if (!blocks || !blocks.length) return ''
  if (typeof blocks === 'string') return blocks
  return blocks
    .map((b) => {
      if (typeof b === 'string') return `<p>${b}</p>`
      const t = (b?.text ?? '').replace(/\n/g, '<br/>')
      return `<p>${t}</p>`
    })
    .join('\n')
}

/**
 * 폼값 → 백엔드 DTO 매핑
 * - product: ProductCreateRequest에 맞춘 필드
 * - variants: 옵션 조합(SKU) 목록 (옵션 미사용 시 1개)
 */
export const buildProductPayload = (form) => {
  const price = Number(form.price || 0)
  const salePrice = form.discountEnabled
    ? Math.max(0, price - Number(form.discount || 0))
    : price

  // 옵션 1축만 우선 지원 (필요 시 확장)
  const option1Name =
    form.useOptions && form.optionGroups?.[0]
      ? String(form.optionGroups[0])
      : null

  let variants = []
  if (form.useOptions && Array.isArray(form.options) && form.options.length) {
    variants = form.options.map((r) => ({
      option1Value: r.label ?? r.value ?? String(r?.key ?? ''),
      addPrice: Number(r.delta || 0),
      stock: Number(r.stock || 0),
    }))
  } else {
    variants = [
      {
        addPrice: 0,
        stock: Number(form.stock || 0),
      },
    ]
  }

  const product = {
    name: form.name.trim(),
    brand: form.brand.trim(),
    category: form.category, // 백엔드 enum과 일치해야 함
    basePrice: price,
    salePrice: salePrice,
    feedbackPoint: Number(form.feedbackPoint || 0),
    saleStartAt: toDateTime(form.saleStart, false),
    saleEndAt: toDateTime(form.saleEnd, true),
    thumbnailUrl: null, // 파일 업로드 후 URL 세팅 권장
    detailHtml: blocksToHtml(form.detailBlocks),
    stockTotal: form.useOptions ? undefined : Number(form.stock || 0),
    option1Name,
    // option2Name..option5Name 필요 시 추가
  }

  return { product, variants }
}

export default buildProductPayload
