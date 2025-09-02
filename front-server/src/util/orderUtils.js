// /src/util/orderUtils.js

/** 날짜·시간 'ko-KR' 로케일 포맷 (없으면 '-') */
export const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('ko-KR') : '-')

/** YYYY-MM-DD 포맷 (문자열 들어오면 앞 10자 방어) */
export const fmtYmd = (s) => {
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(s).slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 숫자만 남기기 */
export const digitsOnly = (v) => String(v ?? '').replace(/\D/g, '')

/** 주문번호 표시: 숫자만인 경우 16자리 제한, 그 외는 원형 유지(최대 24자) */
export const toOrderNo = (row) => {
  const c = row?.orderUid ?? row?.orderNo ?? row?.orderId ?? row?.id ?? ''
  const t = String(c ?? '').trim()
  if (!t) return '-'
  if (/^\d+$/.test(t)) return t.slice(0, 16)
  return t.slice(0, 24)
}

/** 안전한 hasOwnProperty */
export const hasKey = (obj, k) => Object.prototype.hasOwnProperty.call(obj ?? {}, k)

/** 금액 파싱: 숫자, "10,000원" 같은 문자열도 처리 */
const parseMoneyLike = (v) => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d.-]/g, '')
    if (!cleaned) return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** 내부: 배열 아이템 합계 시도 */
const sumItems = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return null
  let sum = 0
  let found = false
  for (const it of arr) {
    const itemTotal =
      parseMoneyLike(it?.totalPrice ?? it?.amount ?? it?.price) ??
      (() => {
        const u = parseMoneyLike(it?.unitPrice ?? it?.price)
        const q = Number(it?.quantity ?? it?.qty ?? 1)
        return u !== null && Number.isFinite(q) ? u * q : null
      })()
    if (itemTotal !== null) {
      sum += itemTotal
      found = true
    }
  }
  return found ? sum : null
}

/** 결제금액 탐색(깊이 3, 키 가중치) */
export const getAmount = (row) => {
  if (!row || typeof row !== 'object') return null

  // 1) 즉시 매칭되는 평면 키들 (camel/snake 아우름)
  const directKeys = [
    'payAmount','paymentAmount','paidAmount','totalAmount','orderAmount','totalPaymentAmount',
    'totalPrice','finalPrice','finalAmount','orderPrice','settlementAmount','actualPayment',
    'actualPay','grandTotal','amount','price',
    'pay_amount','payment_amount','paid_amount','total_amount','order_amount','total_payment_amount',
    'total_price','final_price','final_amount','order_price','settlement_amount','actual_payment',
    'actual_pay','grand_total','paymentAmt','payAmt','paid_price','totalPaidAmount'
  ]
  for (const k of directKeys) {
    if (hasKey(row, k)) {
      const n = parseMoneyLike(row[k])
      if (n !== null) return n
    }
  }

  // 2) 중첩 구조(흔한 위치)
  const nestedCandidates = [
    row?.payment?.amount, row?.payment?.total, row?.payment?.totalAmount, row?.payment?.totalPrice,
    row?.paymentInfo?.paidAmount, row?.summary?.total, row?.summary?.finalPrice,
    row?.total?.amount, row?.total?.price
  ]
  for (const v of nestedCandidates) {
    const n = parseMoneyLike(v)
    if (n !== null) return n
  }

  // 3) 단가*수량
  const unit = parseMoneyLike(
    row?.unitPrice ?? row?.pricePerUnit ?? row?.itemPrice ?? row?.productPrice ?? row?.price
  )
  const qty = Number(row?.quantity ?? row?.qty ?? row?.count ?? row?.orderCount)
  if (unit !== null && Number.isFinite(qty) && qty > 0) return unit * qty

  // 4) items/lineItems/products 합계
  const itemsArrays = [row?.items, row?.orderItems, row?.lineItems, row?.products, row?.orderLines]
  for (const arr of itemsArrays) {
    const s = sumItems(arr)
    if (s !== null) return s
  }

  // 5) 깊이 3까지 모든 스칼라 값 스캔(키 가중치 + 값)
  const MAX_DEPTH = 3
  let best = null // {score, value}

  const scoreKey = (key) => {
    const k = key.toLowerCase()
    let sc = 0
    if (/(grand|final|total)/.test(k)) sc += 3
    if (/(pay|paid|payment)/.test(k)) sc += 2
    if (/(amount|price|subtotal)/.test(k)) sc += 1
    if (/(unit|per|qty|count)/.test(k)) sc -= 2 // 단가/수량 냄새는 감점
    return sc
  }

  const walk = (obj, depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > MAX_DEPTH) return
    if (Array.isArray(obj)) {
      // 배열이면 합계 먼저
      const s = sumItems(obj)
      if (s !== null) {
        const sc = 3 // 꽤 신뢰
        if (!best || sc > best.score || (sc === best.score && s > best.value)) {
          best = { score: sc, value: s }
        }
      }
      for (const it of obj) walk(it, depth + 1)
      return
    }
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object') {
        walk(v, depth + 1)
      } else {
        const n = parseMoneyLike(v)
        if (n !== null && n >= 0) {
          const sc = scoreKey(k)
          if (sc > 0) {
            if (!best || sc > best.score || (sc === best.score && n > best.value)) {
              best = { score: sc, value: n }
            }
          }
        }
      }
    }
  }
  walk(row, 0)
  if (best) return best.value

  return null
}

/** 최대 10자 + … (UI 전용) */
export const truncate10 = (str) => {
  const s = String(str ?? '')
  return s.length > 10 ? s.slice(0, 10) + '…' : s
}

/** CSV 셀 이스케이프 */
export const csvEscape = (val) => {
  const s = String(val ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * CSV 생성 후 다운로드 (BOM 포함 → 엑셀 호환)
 * - 옵션 없으면 기본 컬럼: [주문번호, 상품, 주소, 결제금액, 상태, 피드백마감]
 * - includePhone/includeRequestMemo가 true면 해당 컬럼 추가
 */
export const makeAndDownloadCSV = (
  rows,
  {
    filenamePrefix = 'orders',
    includePhone = false,
    includeRequestMemo = false,
    columns,
    mapRow, // function(row) => any[]
  } = {}
) => {
  // CSV에선 풀텍스트 사용 — 주문번호도 원본 포맷 유지
  const getRawOrderId = (r) => {
    const c = r?.orderUid ?? r?.orderNo ?? r?.orderId ?? r?.id ?? ''
    const t = String(c ?? '').trim()
    return t || '-'
  }

  // 완전 커스텀 모드
  if (Array.isArray(columns) && typeof mapRow === 'function') {
    const header = columns
    const lines = [header.join(',')]
    rows.forEach((r) => {
      const arr = mapRow(r) ?? []
      lines.push(arr.map(csvEscape).join(','))
    })
    return downloadCsvBlob(lines, filenamePrefix)
  }

  // 기본 헤더 구성 + 확장 컬럼
  const header = ['주문번호', '상품', '주소']
  if (includePhone) header.push('연락처')
  if (includeRequestMemo) header.push('배송요청사항')
  header.push('결제금액', '상태', '피드백마감')

  const lines = [header.join(',')]

  rows.forEach((r) => {
    const amt = getAmount(r)
    const arr = [
      getRawOrderId(r),
      String(r?.productName ?? r?.product ?? ''),
      String(r?.address ?? ''),
    ]
    if (includePhone) arr.push(String(r?.phone ?? ''))
    if (includeRequestMemo) arr.push(String(r?.requestMemo ?? r?.requestNote ?? ''))
    arr.push(
      amt === null ? '-' : amt,
      r?.statusText ?? r?.status ?? '-',
      fmtYmd(r?.feedbackDue)
    )
    lines.push(arr.map(csvEscape).join(','))
  })

  return downloadCsvBlob(lines, filenamePrefix)
}

const downloadCsvBlob = (lines, filenamePrefix = 'orders') => {
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const ts = new Date()
  const y = ts.getFullYear()
  const m = String(ts.getMonth() + 1).padStart(2, '0')
  const d = String(ts.getDate()).padStart(2, '0')
  const hh = String(ts.getHours()).padStart(2, '0')
  const mm = String(ts.getMinutes()).padStart(2, '0')

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${filenamePrefix}_${y}${m}${d}_${hh}${mm}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
