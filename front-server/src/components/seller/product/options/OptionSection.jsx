// src/components/seller/product/options/OptionSection.jsx
// 단독형/조합형(최대 5단) – 자동 적용 + 키 정규화 + 초기값 보존(덮어쓰기 방지)

import React, { useEffect, useMemo, useRef, useState } from 'react'
import FieldRow from '../form/FieldRow'
import Button from '../../../common/Button'
import OptionTable from './OptionTable'

const MAX_NAME_LEN = 10
const norm = (s) => String(s ?? '').trim()
const mkKey = (parts = []) => parts.map((p) => `${norm(p.n)}:${norm(p.v)}`).join('|')

// 문자열 → 고유 값 배열(공백/중복 제거)
const parseValues = (s) =>
  Array.from(new Set(String(s || '').split(',').map((v) => v.trim()).filter(Boolean)))

// 옵션명 onChange (길이 제한)
const handleNameChange = (i, setGroups) => (e) => {
  const val = e.target.value
  setGroups((prev) => {
    const prevVal = prev[i]?.name || ''
    let nextVal = val
    if (val.length > MAX_NAME_LEN) {
      if (prevVal.length <= MAX_NAME_LEN) alert(`옵션명은 최대 ${MAX_NAME_LEN}자까지 입력 가능합니다.`)
      nextVal = val.slice(0, MAX_NAME_LEN)
    }
    const next = [...prev]
    next[i] = { ...next[i], name: nextVal }
    return next
  })
}

// 카테시안 곱
const cartesian = (lists) =>
  lists.reduce((a, b) => a.flatMap((x) => b.map((y) => [...x, y])), [[]])

export default function OptionSection({ enabled = false, value, onChange, initial }) {
  const [useOptions, setUseOptions] = useState(!!enabled)
  const [composeType, setComposeType] = useState('combo') // 'single' | 'combo'
  const [nameCount, setNameCount] = useState(1)
  const [sortOrder, setSortOrder] = useState('등록순') // '등록순' | '가나다'
  const [groups, setGroups] = useState([
    { name: '', values: '' },
    { name: '', values: '' },
    { name: '', values: '' },
    { name: '', values: '' },
    { name: '', values: '' },
  ])

  const [appliedCombos, setAppliedCombos] = useState([]) // [{ key, label, parts }]
  const [rowMap, setRowMap] = useState(new Map())        // key -> { addPrice, stock, enabled }

  // 안전 조회: key 우선, 안되면 label
  const getRow = (map, key, label) =>
    (map && typeof map.get === 'function' && (map.get(key) ?? map.get(label))) || undefined

  // ── 1) 서버 initial 하이드레이션 (한 번만) — 여기서 rowMap에 “실제 값”을 넣는다.
  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current || !initial) return
    hydratedRef.current = true

    setUseOptions(!!initial.enabled)
    setComposeType(initial.composeType === 'single' ? 'single' : 'combo')
    const nc = Math.max(1, Math.min(5, initial.nameCount || initial.groups?.length || 1))
    setNameCount(nc)

    // groups: 문자열 입력칸이므로 join
    const nextGroups = Array.from({ length: 5 }).map((_, i) => {
      const g = initial.groups?.[i]
      return g ? { name: g.name || '', values: (g.values || []).join(', ') } : { name: '', values: '' }
    })
    setGroups(nextGroups)

    // rows/rowMap: 키 정규화 + label 폴백도 함께 저장(조회 안정성)
    const nextRows = (initial.rows || []).map((r) => {
      const parts = (r.parts || []).map((p) => ({ n: norm(p.n), v: norm(p.v) }))
      const key = mkKey(parts)
      return { key, label: parts.map((p) => p.v).join(' / '), parts }
    })
    setAppliedCombos(nextRows)

    const m = new Map()
    for (const r of initial.rows || []) {
      const parts = (r.parts || []).map((p) => ({ n: norm(p.n), v: norm(p.v) }))
      const key = mkKey(parts)
      const row = {
        addPrice: Number(r.addPrice ?? 0),
        stock: Number(r.stock ?? 0),
        enabled: r.enabled !== false,
      }
      m.set(key, row)                         // 정규화된 key
      if (r.label) m.set(String(r.label).trim(), row) // label 폴백
    }
    setRowMap(m)
  }, [initial])

  // ── 2) 입력값 → 프리뷰 조합 (키 정규화 동일하게)
  const previewCombos = useMemo(() => {
    const used = groups.slice(0, composeType === 'single' ? 1 : nameCount)
    const lists = used.map((g) => parseValues(g.values))

    if (composeType === 'single') {
      if (!lists[0]?.length) return []
      return lists[0].map((v) => {
        const name = norm(used[0].name) || '옵션1'
        const parts = [{ n: name, v: norm(v) }]
        return { key: mkKey(parts), label: parts[0].v, parts }
      })
    }

    if (!lists.length || lists.some((l) => l.length === 0)) return []

    const product = cartesian(lists)
    let combos = product.map((row) =>
      row.map((v, idx) => ({ n: norm(used[idx].name) || `옵션${idx + 1}`, v: norm(v) }))
    )
    let result = combos.map((parts) => ({
      key: mkKey(parts),
      label: parts.map((p) => p.v).join(' / '),
      parts,
    }))
    if (sortOrder === '가나다') result = result.sort((a, b) => a.label.localeCompare(b.label, 'ko'))
    return result
  }, [groups, nameCount, composeType, sortOrder])

  // ── 3) 프리뷰 바뀔 때: “목록만” 동기화 (rowMap은 절대 갈아엎지 않는다!)
  useEffect(() => {
    setAppliedCombos(previewCombos)
    // ❌ setRowMap(...)으로 새 Map 만들지 않음 — 기존 값 보존
  }, [previewCombos])

  // ── 4) 상위로 변경 전파
  useEffect(() => {
    const uiPayload = {
      enabled: useOptions,
      composeType,
      nameCount,
      groups: groups.slice(0, nameCount).map((g) => ({
        name: g.name,
        values: parseValues(g.values),
      })),
      rows: appliedCombos.map((c) => {
        const r = getRow(rowMap, c.key, c.label) || {}
        return {
          key: c.key,
          label: c.label,
          parts: c.parts,
          addPrice: r.addPrice ?? 0,
          stock: r.stock ?? 0,
          enabled: r.enabled !== false,
        }
      }),
      apiPatch: {
        variants: !useOptions
          ? []
          : appliedCombos.map((c) => {
              const r = getRow(rowMap, c.key, c.label) || {}
              const v = {}
              c.parts.forEach((p, i) => (v[`option${i + 1}Value`] = p.v))
              v.addPrice = Number(r.addPrice ?? 0)
              v.stock = Number(r.stock ?? 0)
              v.enabled = r.enabled !== false
              return v
            }),
      },
    }
    onChange?.(uiPayload)
  }, [useOptions, composeType, nameCount, groups, appliedCombos, rowMap])

  return (
    <div className="space-y-4 max-w-[980px]">
      {/* 옵션 사용 여부 */}
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] sm:gap-4 sm:px-3">
        <div className="text-sm font-semibold text-gray-700 sm:pt-1">옵션</div>
        <div className="flex justify-start gap-2">
          <Button type="button" size="sm" variant={useOptions ? 'signUp' : 'primary'} onClick={() => setUseOptions(false)}>
            설정안함
          </Button>
          <Button type="button" size="sm" variant={useOptions ? 'primary' : 'signUp'} onClick={() => setUseOptions(true)}>
            설정함
          </Button>
        </div>
      </div>

      {!useOptions ? null : (
        <>
          {/* 구성타입 */}
          <FieldRow label="옵션 구성타입" required>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={composeType === 'single'} onChange={() => setComposeType('single')} />
                단독형
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={composeType === 'combo'} onChange={() => setComposeType('combo')} />
                조합형
              </label>
            </div>
          </FieldRow>

          {/* 옵션명 개수 (조합형일 때만) */}
          {composeType === 'combo' && (
            <FieldRow label="옵션명 개수" required>
              <select className="h-10 w-32 rounded-lg border px-3 text-sm" value={nameCount} onChange={(e) => setNameCount(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}개</option>
                ))}
              </select>
            </FieldRow>
          )}

          {/* 정렬 순서 */}
          <FieldRow label="정렬 순서">
            <select className="h-10 w-40 rounded-lg border px-3 text-sm" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option>등록순</option>
              <option>가나다</option>
            </select>
          </FieldRow>

          {/* 옵션입력 */}
          <FieldRow label="옵션입력" required>
            <div className="space-y-2">
              {Array.from({ length: composeType === 'single' ? 1 : nameCount }).map((_, i) => (
                <div className="flex flex-col gap-2 sm:flex-row" key={i}>
                  <input
                    className="h-10 w-[225px] rounded-lg border px-3 text-sm"
                    placeholder={`옵션명 예시: ${i === 0 ? '색상' : '사이즈'}`}
                    value={groups[i].name}
                    maxLength={MAX_NAME_LEN}
                    onChange={handleNameChange(i, setGroups)}
                  />
                  <input
                    className="h-10 w-[462px] rounded-lg border px-3 text-sm"
                    placeholder={i === 0 ? '옵션값 예시: 빨강, 노랑, 파랑' : '옵션값 예시: S, M, L'}
                    value={groups[i].values}
                    onChange={(e) =>
                      setGroups((prev) => {
                        const next = [...prev]
                        next[i] = { ...next[i], values: e.target.value }
                        return next
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </FieldRow>

          {/* 옵션목록 */}
          <FieldRow label="옵션목록">
            <OptionTable
              combos={appliedCombos}
              rowMap={rowMap}
              onChange={(key, patch) =>
                setRowMap((m) => {
                  const next = new Map(m)
                  const base = next.get(key) ?? { addPrice: 0, stock: 0, enabled: true }
                  next.set(key, { ...base, ...patch })
                  return next
                })
              }
            />
          </FieldRow>
        </>
      )}
    </div>
  )
}