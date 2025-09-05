import React, { useEffect, useState } from 'react'
import { FEEDBACK_CATEGORIES } from '../../../constants/feedbacksSurvey'
import { fetchProductsByCategory } from '../../../service/feedbackService'


export default function ProductPicker({ value, onChange }) {
  const [category, setCategory] = useState(FEEDBACK_CATEGORIES[0])
  const [products, setProducts] = useState([])
  const [productId, setProductId] = useState(null)

  useEffect(() => {
    (async () => {
      const list = await fetchProductsByCategory(category)
      setProducts(list)
      const first = list?.[0]?.id ?? null
      setProductId(first)
      onChange?.({ category, productId: first })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  useEffect(() => {
    onChange?.({ category, productId })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm font-medium">카테고리</label>
      <select
        className="input-basic rounded-md border px-3 py-2"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {FEEDBACK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <label className="ml-2 text-sm font-medium">상품</label>
      <select
        className="input-basic rounded-md border px-3 py-2"
        value={productId ?? ''}
        onChange={(e) => setProductId(Number(e.target.value))}
      >
        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  )
}
