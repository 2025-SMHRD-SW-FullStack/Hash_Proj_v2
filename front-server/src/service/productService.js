// /src/service/productService.js
import api from '/src/config/axiosInstance'

/** 공개 상품 목록 */
export const getProducts = async (params = {}) => {
  const { data } = await api.get('/api/products', { params })
  return data
}

/** 공개 상품 상세 */
export const getProductDetail = async (id) => {
  const { data } = await api.get(`/api/products/${id}`)
  return data
}

/** 내 상품 목록(셀러 전용) */
export const getMyProducts = async (params = {}) => {
  const { data } = await api.get('/api/seller/products', { params })
  return data
}

/** 상세(셀러 편집용) — 공개 상세 우선 → 폴백 + 응답 표준화({ product, variants }) */
export const getMyProductDetail = async (id) => {
  // 강제 경로가 있으면 우선 사용
  const forced = (import.meta.env?.VITE_PRODUCT_DETAIL_PATH || '').trim()
  if (forced) {
    const path = forced.replace(':id', id)
    const { data } = await api.get(path)
    return normalizeDetail(data)
  }

  // 405 회피: 공개 상세 먼저 시도
  const candidates = [
    `/api/products/${id}`,        // 공개 상세(대부분 GET 허용)
    `/api/product/${id}`,
    `/api/seller/products/${id}`, // 일부 서버에서 GET 미허용(405) → 뒤로
    `/api/seller/product/${id}`,
  ]

  let lastErr
  for (const url of candidates) {
    try {
      const { data } = await api.get(url)
      return normalizeDetail(data)
    } catch (e) {
      const st = e?.response?.status
      if (st === 404 || st === 405) { lastErr = e; continue } // 다음 후보
      throw e
    }
  }
  throw lastErr ?? new Error('No product detail endpoint matched')
}

/** 상품 생성(셀러 전용) */
export const createMyProduct = async (payload) => {
  const { data } = await api.post('/api/seller/products', payload)
  return data
}

/** 상품 수정(셀러 전용) */
export const updateMyProduct = async (id, payload) => {
  const { data } = await api.put(`/api/seller/products/${id}`, payload)
  return data
}

/** 상품 삭제(셀러 전용) */
export const deleteMyProduct = async (id) => {
  const { data } = await api.delete(`/api/seller/products/${id}`)
  return data
}

/** 상품 삭제(관리자 전용) */
export const adminDeleteProduct = async (id) => {
    const { data } = await api.delete(`/api/admin/products/${id}`);
    return data;
}

/* 호환 alias (기존 코드가 쓰고 있을 수 있어 유지) */
export const fetchProducts = getProducts
export const createProduct = createMyProduct
export const updateProduct = updateMyProduct
export const deleteProduct = deleteMyProduct

// ── helpers ───────────────────────────────────────────────
function normalizeDetail(src) {
  // 이미 표준형이면 그대로 정규화해서 반환
  if (src && (src.product || Array.isArray(src?.variants))) {
    return {
      product: normalizeProduct(src.product ?? {}),
      variants: Array.isArray(src.variants) ? src.variants.map(normalizeVariant) : [],
    }
  }
  // 공개 상세를 바로 돌려주는 서버: 전체를 product로 간주
  const product = normalizeProduct(src ?? {})
  const variants = Array.isArray(src?.variants)
    ? src.variants
    : (Array.isArray(src?.options) ? src.options : [])
  return { product, variants: variants.map(normalizeVariant) }
}

function normalizeProduct(p = {}) {
  return {
    ...p,
    // 필드 동의어 정규화
    basePrice: Number(p.basePrice ?? p.price ?? 0) || 0,
    salePrice: Number(p.salePrice ?? p.discountedPrice ?? p.finalPrice ?? 0) || 0,
    thumbnailUrl: p.thumbnailUrl ?? p.thumbnail ?? p.thumbUrl ?? '',
    detailHtml: p.detailHtml ?? p.detail ?? p.descriptionHtml ?? '',
    // 스웨거 예시(optionName) / 내부(option1Name) 모두 대응
    option1Name: p.option1Name ?? p.optionName ?? p.opt1Name ?? '',
    option2Name: p.option2Name ?? p.opt2Name ?? '',
    option3Name: p.option3Name ?? p.opt3Name ?? '',
    option4Name: p.option4Name ?? p.opt4Name ?? '',
    option5Name: p.option5Name ?? p.opt5Name ?? '',
  }
}

function normalizeVariant(v = {}) {
  // addPrice / delta / extraPrice 등 호환
  const add = v.addPrice ?? v.delta ?? v.extraPrice ?? 0
  return {
    option1Value: v.option1Value ?? v.optionValue ?? v.opt1 ?? v.o1 ?? null,
    option2Value: v.option2Value ?? v.opt2 ?? v.o2 ?? null,
    option3Value: v.option3Value ?? v.opt3 ?? v.o3 ?? null,
    option4Value: v.option4Value ?? v.opt4 ?? v.o4 ?? null,
    option5Value: v.option5Value ?? v.opt5 ?? v.o5 ?? null,
    addPrice: Number(add) || 0,
    stock: Number(v.stock ?? v.qty ?? 0) || 0,
    skuCode: v.skuCode ?? v.sku ?? null,
  }
}
