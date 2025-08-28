import api from "../config/axiosInstance";

// 상세
export const getProductDetail = (id) =>
  api.get(`/api/products/${id}`).then((res) => res.data);

// 목록(필요 시)
export const getProducts = (params) =>
  api.get("/api/products", { params }).then((res) => res.data);

// ── 셀러 전용 목록/생성/수정/삭제 ────────────────────────────────
export const getMyProducts = (params = {}) =>
  api.get('/api/seller/products', { params }).then((res) => res.data)

export const createMyProduct = (payload) =>
  api.post('/api/seller/products', payload).then((res) => res.data)

export const updateMyProduct = (id, payload) =>
  api.put(`/api/seller/products/${id}`, payload).then((res) => res.data)

export const deleteMyProduct = (id) =>
  api.delete(`/api/seller/products/${id}`).then((res) => res.data)

// ── 유틸: 폼 → API 페이로드 ────────────────────────────────────
const N = (v, d = 0) => (v === '' || v == null ? d : Number(v))

export const buildProductPayload = (form = {}, variantRows = []) => {
  const product = {
    name: form.name?.trim(),
    brand: form.brand?.trim() || null,
    category: form.category || null,

    basePrice: N(form.basePrice),
    // '' 이면 세일가 없음 -> null
    salePrice: form.salePrice === '' || form.salePrice == null ? null : N(form.salePrice, null),

    thumbnailUrl: form.thumbnailUrl || null,
    detailHtml: form.detailHtml || '',
    stockTotal: N(form.stockTotal),
    feedbackPoint: N(form.feedbackPoint, 0),

    // 날짜는 'YYYY-MM-DD' 권장(시간 붙이면 하루 밀릴 수 있음)
    saleStartAt: form.saleStartAt || null,
    saleEndAt: form.saleEndAt || null,

    // 옵션명(없는 건 null로)
    option1Name: form.option1Name || null,
    option2Name: form.option2Name || null,
    option3Name: form.option3Name || null,
    option4Name: form.option4Name || null,
    option5Name: form.option5Name || null,
  }

  const variants = (variantRows || []).map((r) => ({
    id: r.id, // 수정 시에만 존재
    option1Value: r.option1Value || null,
    option2Value: r.option2Value || null,
    option3Value: r.option3Value || null,
    option4Value: r.option4Value || null,
    option5Value: r.option5Value || null,
    addPrice: N(r.addPrice, 0),
    stock: N(r.stock, 0),
    skuCode: r.skuCode || null,
  }))

  return { product, variants }
}

// ── 유틸: 변형 재고 합계 ───────────────────────────────────────
export const sumVariantStock = (rows = []) =>
  rows.reduce((acc, r) => acc + (r && r.stock ? Number(r.stock) : 0), 0)