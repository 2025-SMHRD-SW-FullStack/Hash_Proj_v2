// src/components/seller/product/options/OptionSection.jsx
// OptionSection.jsx — 단독형/조합형(최대 5단) – 자동 적용 버전
import React, { useEffect, useMemo, useRef, useState } from 'react'
import FieldRow from '../form/FieldRow'
import Button from '../../../common/Button'
import OptionTable from './OptionTable'


const MAX_NAME_LEN = 10;

// 문자열 → 고유 값 배열(공백/중복 제거)
const parseValues = (s) =>
  Array.from(
    new Set(
      String(s || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    )
  )

// 옵션명 onChange 핸들러 (초과 입력시 1번만 알림 + 자르기)
const handleNameChange = (i, setGroups) => (e) => {
  const val = e.target.value;
  setGroups(prev => {
    const prevVal = prev[i]?.name || '';
    let nextVal = val;
    if (val.length > MAX_NAME_LEN) {
      // 이전엔 10 이하였고, 이번에 초과하려 했을 때만 알림
      if (prevVal.length <= MAX_NAME_LEN) {
        alert(`옵션명은 최대 ${MAX_NAME_LEN}자까지 입력 가능합니다.`);
      }
      nextVal = val.slice(0, MAX_NAME_LEN);
    }
    const next = [...prev];
    next[i] = { ...next[i], name: nextVal };
    return next;
  });
};


// 카테시안 곱
const cartesian = (lists) =>
  lists.reduce((a, b) => a.flatMap((x) => b.map((y) => [...x, y])), [[]])

const MAX_DEPTH = 5

export default function OptionSection({ enabled = false, value, onChange, initial }) {
  // 옵션 사용 여부
  const [useOptions, setUseOptions] = useState(!!enabled)

  // 구성 타입: 단독형(1단) | 조합형(다단)
  const [composeType, setComposeType] = useState('combo') // 'single' | 'combo'

  // 옵션명 개수(1~5)
  const [nameCount, setNameCount] = useState(1)

  // 정렬
  const [sortOrder, setSortOrder] = useState('등록순') // '등록순' | '가나다'

  // 옵션 그룹(최대 5단)
  const [groups, setGroups] = useState([
    { name: '', values: '' },
    { name: '', values: '' },
    { name: '', values: '' },
    { name: '', values: '' },
    { name: '', values: '' },
  ])

  // 적용된 조합 + 각 행 데이터(addPrice/stock/enabled)
  const [appliedCombos, setAppliedCombos] = useState([]) // [{ key, label, parts }]
  const [rowMap, setRowMap] = useState(new Map()) // key -> { addPrice, stock, enabled }

  const hydratedRef = useRef(false)
  useEffect(() => {
    if (hydratedRef.current) return
    if (!initial) return
    hydratedRef.current = true
    // 옵션 사용 여부/타입
    setUseOptions(!!initial.enabled)
    setComposeType(initial.composeType === 'single' ? 'single' : 'combo')
    const nc = Math.max(1, Math.min(5, initial.nameCount || initial.groups?.length || 1))
    setNameCount(nc)
    // 그룹: values는 문자열 입력란 형태로
    const nextGroups = Array.from({ length: 5 }).map((_, i) => {
      const g = initial.groups?.[i]
      return g ? { name: g.name || '', values: (g.values || []).join(', ') } : { name: '', values: '' }
    })
    setGroups(nextGroups)
    // 콤보/rowMap
    const nextRows = (initial.rows || []).map(r => ({
      key: r.key, label: r.label, parts: r.parts
    }))
    setAppliedCombos(nextRows)
    const m = new Map()
    for (const r of (initial.rows || [])) {
      m.set(r.key, {
        addPrice: Number(r.addPrice || 0),
        stock: Number(r.stock || 0),
        enabled: r.enabled !== false,
      })
    }
    setRowMap(m)
  }, [initial])

  // ────────────────────────────────────────────────
  // 프리뷰 조합(입력값으로 즉시 생성)
  const previewCombos = useMemo(() => {
    const used = groups.slice(0, composeType === 'single' ? 1 : nameCount)
    const lists = used.map((g) => parseValues(g.values))

    if (composeType === 'single') {
      if (!lists[0]?.length) return []
      return lists[0].map((v) => {
        const name = used[0].name?.trim() || '옵션1'
        return {
          key: `${name}:${v}`,
          label: `${v}`,
          parts: [{ n: name, v }],
        }
      })
    }

    // 조합형: 모든 단에 최소 1개 값 필요
    if (!lists.length || lists.some((l) => l.length === 0)) return []

    const product = cartesian(lists)
    let combos = product.map((row) =>
      row.map((v, idx) => ({ n: used[idx].name?.trim() || `옵션${idx + 1}`, v }))
    )

    let result = combos.map((parts) => ({
      key: parts.map((p) => `${p.n}:${p.v}`).join('|'),
      label: parts.map((p) => p.v).join(' / '),
      parts,
    }))

    if (sortOrder === '가나다') {
      result = result.sort((a, b) => a.label.localeCompare(b.label, 'ko'))
    }
    return result
  }, [groups, nameCount, composeType, sortOrder])

  // ✅ 실시간 자동 적용: 프리뷰가 바뀌면 테이블/rowMap 동기화
  useEffect(() => {
    setAppliedCombos(previewCombos)
    setRowMap((prev) => {
      const next = new Map()
      for (const c of previewCombos) {
        const old = prev.get(c.key)
        next.set(c.key, old ?? { addPrice: 0, stock: 0, enabled: true })
      }
      return next
    })
  }, [previewCombos])

  // API 바디 패치 생성
  const buildApiPatch = useMemo(() => {
    if (!useOptions) return { variants: [] }
    if (!appliedCombos.length) return { variants: [] }

    const used = groups
      .slice(0, composeType === 'single' ? 1 : nameCount)
      .map((g, i) => ({ name: g.name?.trim() || `옵션${i + 1}` }))

    const patch = {}
    used.forEach((g, i) => {
      patch[`option${i + 1}Name`] = g.name
    })

    patch.variants = appliedCombos.map((c) => {
      const row = rowMap.get(c.key) || {}
      const v = {}
      c.parts.forEach((p, i) => {
        v[`option${i + 1}Value`] = p.v
      })
      v.addPrice = Number(row.addPrice || 0)
      v.stock = Number(row.stock || 0)
      v.enabled = row.enabled !== false
      return v
    })

    return patch
  }, [useOptions, appliedCombos, rowMap, groups, nameCount, composeType])

  // 상위로 변경 전파 (UI 상태 + apiPatch 동시 제공)
  useEffect(() => {
    const uiPayload = {
      enabled: useOptions,
      composeType,
      nameCount,
      groups: groups.slice(0, nameCount).map((g) => ({
        name: g.name,
        values: parseValues(g.values),
      })),
      rows: appliedCombos.map((c) => ({
        key: c.key,
        label: c.label,
        parts: c.parts,
        addPrice: rowMap.get(c.key)?.addPrice || 0,
        stock: rowMap.get(c.key)?.stock || 0,
        enabled: rowMap.get(c.key)?.enabled !== false,
      })),
      apiPatch: buildApiPatch,
    }
    onChange?.(uiPayload)
  }, [useOptions, composeType, nameCount, groups, appliedCombos, rowMap, buildApiPatch])

  return (
    <div className="space-y-4 max-w-[980px]">
      {/* 옵션 사용 여부 */}
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] sm:gap-4 sm:px-3">
        <div className="text-sm font-semibold text-gray-700 sm:pt-1">옵션</div>
        <div className="flex justify-start gap-2">
          <Button
            type="button"
            size="sm"
            variant={useOptions ? 'signUp' : 'primary'}
            onClick={() => setUseOptions(false)}
          >
            설정안함
          </Button>
          <Button
            type="button"
            size="sm"
            variant={useOptions ? 'primary' : 'signUp'}
            onClick={() => setUseOptions(true)}
          >
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
                <input
                  type="radio"
                  checked={composeType === 'single'}
                  onChange={() => setComposeType('single')}
                />
                단독형
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={composeType === 'combo'}
                  onChange={() => setComposeType('combo')}
                />
                조합형
              </label>
            </div>
          </FieldRow>

          {/* 옵션명 개수 (조합형일 때만 표시) */}
          {composeType === 'combo' && (
            <FieldRow label="옵션명 개수" required>
              <select
                className="h-10 w-32 rounded-lg border px-3 text-sm"
                value={nameCount}
                onChange={(e) => setNameCount(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}개
                  </option>
                ))}
              </select>
            </FieldRow>
          )}

          {/* 정렬 순서 */}
          <FieldRow label="정렬 순서">
            <select
              className="h-10 w-40 rounded-lg border px-3 text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
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

          {/* 옵션목록 (자동 적용) */}
          <FieldRow label="옵션목록">
            <OptionTable
              combos={appliedCombos}
              rowMap={rowMap}
              onChange={(key, patch) =>
                setRowMap((m) => new Map(m.set(key, { ...m.get(key), ...patch })))
              }
            />
          </FieldRow>
        </>
      )}
    </div>
  )
}