// src/pages/seller/OrdersPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMediaQuery } from 'react-responsive'
import StatusChips from '../../components/seller/StatusChips'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import OrderDetailContent from '../../components/seller/OrderDetailContent'
import { carrierOptions, carrierLabel, resolveCarrier } from '../../constants/carriers'
import { fetchSellerOrders, registerShipment, ORDER_STATUS_MAP, mapStatusForDisplay } from '../../service/orderService'
import { toOrderNo, getAmount, truncate10, makeAndDownloadCSV, resolveFeedbackDue } from '../../util/orderUtils'
import { fetchPendingExchanges, approveExchange, rejectExchange, shipExchange } from '../../service/exchangeService'
import ExchangeShipDialog from '../../components/seller/ExchangeShipDialog'
import BaseTable from '../../components/common/table/BaseTable'
import TableToolbar from '../../components/common/table/TableToolbar'
import { useOrderStore } from '../../stores/orderStore'
import { getExchangeStatusLabel } from '../../constants/exchange'
import CategorySelect from '../../components/common/CategorySelect'

// ⬇️ 추가: 상세 API 호출을 위해 axios 인스턴스
import api from '../../config/axiosInstance'

// ---- UI 토큰
const box = 'rounded-xl border bg-white p-4 shadow-sm'

// 서버 enum에 맞춘 칩 (백엔드 OrderStatus와 일치)
const ORDER_STATUS_CHIPS = [
  { value: 'ALL', label: '전체' },
  { value: 'PAID', label: '신규주문' },
  { value: 'READY', label: '배송준비중' },
  { value: 'IN_TRANSIT', label: '배송중' },
  { value: 'DELIVERED', label: '배송완료' },
  { value: 'CONFIRMED', label: '구매확정' },
  { value: 'EXCHANGE', label: '교환요청' },
]

function getSelectedCartIdsFromQuery() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const mode = (sp.get('mode') || '').toLowerCase();
    const raw = sp.get('items') || '';
    const ids = raw
      .split(',')
      .map(s => Number(s.trim()))
      .filter(n => Number.isFinite(n));
    return { mode, ids };
  } catch {
    return { mode: null, ids: [] };
  }
}

// 리스트 높이(10행 기준)
const SCROLL_Y = 48 * 10 + 44 // rowH * 10 + headerH

// ⬇️ 추가: 교환 상세용 상수/헬퍼 (CSS 영향 없음)
const EXCHANGE_BASE = '/api/seller/exchanges';

const pick = (v, ...paths) => {
  for (const p of paths) {
    const val = p.split('.').reduce((a, c) => (a ? a[c] : undefined), v);
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return '';
};

const formatDateTime = (s) => {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const makeAddress = (detail) => {
  const a1 = pick(detail, 'order.address1', 'order.addr1', 'order.addressLine1');
  const a2 = pick(detail, 'order.address2', 'order.addr2', 'order.addressLine2');
  const zip = pick(detail, 'order.zipcode', 'order.zonecode', 'order.postalCode');
  return [a1, a2, zip ? `(${zip})` : ''].filter(Boolean).join(' ');
};

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') || 'ALL').toUpperCase()
  const q = searchParams.get('q') || ''
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const isExchange = status === 'EXCHANGE'

  const { mode: orderModeFromQuery, ids: selectedCartItemIdsFromQuery } = React.useMemo(
    () => getSelectedCartIdsFromQuery(),
    []
  );

  // 모바일 여부
  const isMobile = useMediaQuery({ maxWidth: 767 })

  // 전역 주문 상태
  const {
    orders: globalOrders,
    setOrders: setGlobalOrders,
    updateOrderStatus: updateGlobalOrderStatus,
    upsertOrder: upsertGlobalOrder,
    setForceRefresh: setGlobalForceRefresh
  } = useOrderStore()

  // 검색 입력 상태(IME용)
  const [qInput, setQInput] = useState(q)
  const [isComp, setIsComp] = useState(false)
  useEffect(() => setQInput(q), [q])

  // 데이터/상태
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0
  })

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState(null)

  // 교환 상세 모달(이미지/사유)
  const [exDetailOpen, setExDetailOpen] = useState(false)
  const [exDetail, setExDetail] = useState(null)

  // 운송장 입력/편집
  const [shipForm, setShipForm] = useState({}) // { [orderId]: { carrierCode, trackingNo } }
  const [editing, setEditing] = useState(new Set())// Set<orderId>

  // 교환 발송 모달
  const [shipTarget, setShipTarget] = useState(null)

  // 선택 체크박스
  const [selected, setSelected] = useState(new Set())
  const allVisibleIds = useMemo(() => (rows ?? []).map(r => r?.id), [rows])

  const setParam = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k)
      else next.set(k, String(v))
    })
    setSearchParams(next)
  }

  const handleReset = () => {
    setParam({ status: 'ALL', q: '' })
    setSelected(new Set())
  }

  const prefillShipFormFromRows = (arr) => {
    const next = {}
    for (const r of arr) {
      const id = r?.id
      if (!id) continue
      const code = r.courierCode || resolveCarrier(r.courierName || '')?.code || ''
      const no = r.trackingNo || ''
      if (code || no) next[id] = { carrierCode: code, trackingNo: no }
    }
    setShipForm(next)
  }

    // 교환 사진 URL 정규화 (문자/배열/객체 대응 + 상대경로 보정)
  const normalizeImageUrls = (val) => {
    if (!val) return [];
    let arr = val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        arr = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        arr = [val];
      }
    }
    if (!Array.isArray(arr)) arr = [arr];
    const fileBase =
      (import.meta.env?.VITE_FILE_BASE_URL || '') ||
      (new URL(api.defaults?.baseURL ?? '', window.location.origin)).origin;
    const base = String(fileBase).replace(/\/$/, '');
    return arr
      .map((it) => (typeof it === 'string' ? it : (it?.imageUrl || it?.url || it?.path)))
      .filter(Boolean)
      .map((u) => /^(https?:|data:|blob:)/.test(u) ? u : (u.startsWith('/') ? (base + u) : u));
  };

// 주문번호 클릭 → 교환 상세 모달 열기
const openExchangeDetail = (row) => {
  const photos = normalizeImageUrls(row.photos || row.images || row.photoUrls);
  setExDetail({ ...row, photos });
  setExDetailOpen(true);
};

  // 데이터 로드
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      if (isExchange) {
      // 1) 기본 목록
      const raw = await fetchPendingExchanges();
      const list = Array.isArray(raw?.content) ? raw.content
        : Array.isArray(raw) ? raw
        : Array.isArray(raw?.list) ? raw.list
        : [];

      // 2) 서버가 확장해 준 필드들을 그대로 매핑 (추가 호출 없음)
      const mapped = list.map((v) => ({
        id: v.id,
        orderId: v.orderId ?? null,
        orderUid: v.orderUid || '-',                                         // 주문번호
        productName: v.productName || '-',                                   // 상품명
        receiver: v.receiver || '-',                                         // 받는이
        address: [v.addr1, v.addr2, v.zipcode ? `(${v.zipcode})` : '']       // 주소
                  .filter(Boolean).join(' ') || '-',
        phone: v.phone || '-',                                               // 연락처
        deliveryMemo: v.requestMemo || '-',                                  // 배송요청사항
        status: v.status || 'REQUESTED',                                     // 상태
        reasonText: v.reasonText || '-',                                     // 사유
        createdAt: v.createdAt || null,                                      // 신청일 (원시값, 아래 컬럼에서 format)
        photos: v.photos || v.images || v.photoUrls || [],                   // 사진 보존
      }));

        setRows(mapped);
        setPagination(p => ({ ...p, page: 0, size: 200, totalElements: mapped.length, totalPages: 1 }))
        setSelected(new Set())
      } else {
        // 주문 목록
        const apiStatus =
          (status === 'ALL' || status === 'EXCHANGE')
            ? undefined
            : (ORDER_STATUS_MAP?.[status] ?? status)
        const response = await fetchSellerOrders({
          status: apiStatus,
          from,
          to,
          q,
          page: 0,
          size: 200
        })

        const arr = response?.content || response?.items || []
        setRows(arr)

        if (arr.length > 0) setGlobalOrders(arr)

        if (response?.page) {
          setPagination({
            page: response.page.number || 0,
            size: response.page.size || 20,
            totalElements: response.page.totalElements || arr.length,
            totalPages: response.page.totalPages || 1
          })
        }

        prefillShipFormFromRows(arr)
        setSelected(prev => {
          const visible = new Set(arr.map(r => r?.id))
          const next = new Set()
          prev.forEach(id => { if (visible.has(id)) next.add(id) })
          return next
        })
      }
    } catch (e) {
      console.error(isExchange ? '교환 목록 로드 실패:' : '주문 목록 로드 실패:', e)
      setError(e?.response?.data?.message || e.message || '목록을 불러오지 못했습니다.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [isExchange, status, from, to, q, setGlobalOrders])

  useEffect(() => { load() }, [load])

  // 상세 모달 오픈
  const openDetail = (gridRow) => {
    const amt = getAmount(gridRow)
    const carrier =
      (gridRow.courierCode && { code: gridRow.courierCode }) ||
      resolveCarrier(gridRow.courierName || '')

    const normalized = {
      orderUid: gridRow.orderUid ?? gridRow.orderNo ?? gridRow.orderId ?? gridRow.id,
      orderNo: gridRow.orderNo ?? undefined,
      orderId: gridRow.orderId ?? undefined,

      orderedAt: gridRow.orderDate ?? gridRow.orderedAt ?? gridRow.createdAt ?? null,
      status: mapStatusForDisplay(gridRow.status) || gridRow.statusText || gridRow.status || '',
      statusText: mapStatusForDisplay(gridRow.status) || gridRow.statusText || gridRow.status || '',
      deliveredAt: gridRow.deliveredAt ?? gridRow.deliveryCompletedAt ?? null,
      feedbackAt: gridRow.feedbackAt ?? gridRow.feedbackWrittenAt ?? null,

      carrierCode: gridRow.carrierCode ?? gridRow.courierCode ?? carrier?.code ?? '',
      trackingNo: gridRow.trackingNo ?? gridRow.trackingNumber ?? '',
      buyer: gridRow.receiver ?? gridRow.buyer?.name ?? '',
      phone: gridRow.phone ?? gridRow.receiverPhone ?? gridRow.buyer?.phone ?? '',
      address: gridRow.address ?? gridRow.deliveryAddress ?? gridRow.address1 ?? '',
      product: gridRow.productName ?? gridRow.product?.name ?? gridRow.product ?? '',

      price: amt,
      requestNote: gridRow.requestMemo ?? gridRow.requestNote ?? gridRow.deliveryMemo ?? '',
      feedbackText: gridRow.feedbackText ?? gridRow.feedback ?? '',
    }

    setDetailRow({ ...gridRow, ...normalized })
    setDetailOpen(true)
  }

  // 운송장 편집 토글
  const beginEdit = (row) => {
    const id = row.id
    const next = new Set(editing); next.add(id)
    setEditing(next)
    setShipForm((s) => {
      const cur = s[id] || {}
      const guessed = row.courierCode || resolveCarrier(row.courierName || '')?.code || ''
      return { ...s, [id]: { carrierCode: cur.carrierCode || guessed || '', trackingNo: cur.trackingNo || row.trackingNo || '' } }
    })
  }
  const cancelEdit = (id) => {
    const next = new Set(editing); next.delete(id)
    setEditing(next)
  }

  // 운송장 등록/수정
  const onSubmitShipment = async (row) => {
    const id = row.id
    const f = shipForm[id] || {}
    if (!f.carrierCode || !f.trackingNo) return alert('택배사와 운송장 번호를 입력하세요.')
    try {
      await registerShipment(id, {
        carrierCode: f.carrierCode,
        carrierName: carrierLabel(f.carrierCode) || '',
        trackingNo: f.trackingNo,
      })

      const updatedOrder = {
        ...row,
        status: 'READY',
        statusText: '배송준비중',
        courierName: carrierLabel(f.carrierCode),
        courierCode: f.carrierCode,
        trackingNo: f.trackingNo
      }

      setRows((prev) => prev.map(r =>
        r.id === id ? updatedOrder : r
      ))

      updateGlobalOrderStatus(id, 'READY', {
        courierName: carrierLabel(f.carrierCode),
        courierCode: f.carrierCode,
        trackingNo: f.trackingNo
      })

      setGlobalForceRefresh(true)

      cancelEdit(id)
      alert('운송장이 등록되었습니다.')
    } catch (e) {
      console.error('운송장 등록 실패:', e)
      alert(e?.response?.data?.message || '운송장 등록 실패')
    }
  }

  // 엑셀(CSV)
  const handleDownloadExcel = () => {
    const picked = (rows ?? []).filter(r => selected.has(r?.id))
    const data = picked.length ? picked : (rows ?? [])
    makeAndDownloadCSV(data, {
      filenamePrefix: 'orders',
      columns: ['주문번호', '상품', '판매자', '주소', '연락처', '배송요청사항', '상태', '피드백마감'],
      mapRow: (r) => {
        const rawId = (r?.orderUid ?? r?.orderNo ?? r?.orderId ?? r?.id ?? '').toString().trim() || '-'
        const sellerInfo = r?.sellerName || r?.shopName || r?.seller?.name || r?.seller?.shopName || r?.sellerId || '-'

        return [
          rawId,
          String(r?.productName ?? r?.product?.name ?? r?.product ?? ''),
          String(sellerInfo),
          String(r?.address ?? r?.deliveryAddress ?? ''),
          String(r?.phone ?? r?.receiverPhone ?? ''),
          String(r?.requestMemo ?? r?.requestNote ?? r?.deliveryMemo ?? ''),
          String(mapStatusForDisplay(r?.status) ?? r?.statusText ?? '-'),
          resolveFeedbackDue(r),
        ]
      },
    })
  }

  // 주문 컬럼 (원본 유지)
  const orderColumns = useMemo(() => ([
    {
      key: 'orderNo',
      header: '주문번호',
      width: 140,
      className: 'text-left',
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-blue-600 hover:underline"
          onClick={(e) => { e.stopPropagation(); openDetail(r) }}
        >
          {toOrderNo(r)}
        </Button>
      ),
    },
    {
      key: 'productName',
      header: '상품',
      width: 220,
      className: 'text-left',
      render: (r) => truncate10(r?.productName ?? r?.product?.name ?? r?.product ?? '')
    },
    {
      key: 'receiver',
      header: '받는이',
      width: 120,
      render: (r) => r.receiver || r.buyer?.name || '-'
    },
    {
      key: 'phone',
      header: '연락처',
      width: 130,
      render: (r) => r.phone || r.receiverPhone || '-'
    },
    {
      key: 'address',
      header: '주소',
      width: 320,
      className: 'text-left',
      render: (r) => (
        <div>
          <div title={r?.address || r?.deliveryAddress}>{truncate10(r?.address || r?.deliveryAddress)}</div>
          {(r.courierName && r.trackingNo && !editing.has(r.id)) && (
            <div className="mt-1 text-xs text-gray-500">
              {r.courierName} / {r.trackingNo}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'request',
      header: '배송요청사항',
      width: 240,
      className: 'text-left',
      render: (r) => truncate10(r?.requestMemo ?? r?.requestNote ?? r?.deliveryMemo ?? '') || '-'
    },
    {
      key: 'status',
      header: '상태',
      width: 110,
      render: (r) => (
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[12px] font-medium text-gray-800">
          {mapStatusForDisplay(r?.status) || r?.statusText || '-'}
        </span>
      )
    },
    {
      key: 'due', header: '피드백 마감', width: 120,
      render: (r) => resolveFeedbackDue(r)
    },
    {
      key: 'ship', header: '운송장', width: 260,
      render: (r) => {
        const id = r.id
        const isEditing = editing.has(id)
        const f = shipForm[id] || {}
        return (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {isEditing ? (
              <>
                <select
                  className="h-9 rounded-md border px-2 text-sm"
                  value={f.carrierCode || ''}
                  onChange={(e) => setShipForm((s) => ({ ...s, [id]: { ...s[id], carrierCode: e.target.value } }))}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">택배사</option>
                  {carrierOptions.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                <input
                  className="h-9 w-[160px] rounded-md border px-2 text-sm"
                  placeholder="운송장 번호"
                  value={f.trackingNo || ''}
                  onChange={(e) => setShipForm((s) => ({ ...s, [id]: { ...s[id], trackingNo: e.target.value } }))}
                  onClick={(e) => e.stopPropagation()}
                />
                <Button size="sm" onClick={(e) => { e.stopPropagation(); onSubmitShipment(r) }}>
                  {r.trackingNo ? '운송장 수정' : '운송장 등록'}
                </Button>
                <Button size="sm" variant="admin" onClick={(e) => { e.stopPropagation(); cancelEdit(id) }}>
                  취소
                </Button>
              </>
            ) : (
              <Button size="sm" variant="admin" onClick={(e) => { e.stopPropagation(); beginEdit(r) }}>
                {r.trackingNo ? '수정' : '운송장 등록'}
              </Button>
            )}
          </div>
        )
      },
    },
  ]), [editing, shipForm])

  // 교환 행/모달 동시 패치 (즉시 반영)
  const patchExchangeRow = useCallback((id, patch) => {
    setRows(prev => prev.map(r => (r?.id === id ? { ...r, ...patch } : r)));
    setExDetail(prev => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  // pending 목록에서 행 제거(승인/반려/발송/완료 등)
  const removeExchangeRow = useCallback((id) => {
    setRows(prev => prev.filter(r => r?.id !== id));
    setExDetail(prev => (prev && prev.id === id ? null : prev));
    setExDetailOpen(prev => (prev && exDetail?.id === id ? false : prev));
  }, [exDetail]);

  // ⬇️ 교환 컬럼 (요청한 9개 필드 + 작업 버튼)
  const exchangeColumns = useMemo(() => ([
    {
      key: 'orderUid',
      header: '주문번호',
      width: 140,
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-blue-600 hover:underline"
          onClick={(e) => { e.stopPropagation(); openExchangeDetail(r) }}
        >
          {r.orderUid || '-'}
        </Button>
      ),
    },
    { key: 'productName',  header: '상품명',        width: 220 },
    { key: 'receiver',     header: '받는이',        width: 120 },
    { key: 'address',      header: '주소',          width: 300 },
    { key: 'phone',        header: '연락처',        width: 130 },
    { key: 'deliveryMemo', header: '배송요청사항',  width: 220,
      render: (r) => (r?.deliveryMemo ?? '') || '-' },
    {
      key: 'status',
      header: '상태',
      width: 110,
      render: r => (
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-[12px] font-medium text-gray-800">
          {getExchangeStatusLabel(r.status)}
        </span>
      )
    },
    { key: 'reasonText',   header: '사유',          width: 300, className: 'text-left' },
    {
      key: 'createdAt', header: '신청일', width: 160,
      render: r => formatDateTime(r.createdAt)
    },
    {
      key: 'actions',
      header: '작업',
      width: 240,
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          {/* 반려 */}
          <Button
            variant="danger"   // Button.jsx의 빨강 스타일
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              (async () => {
                const reason = window.prompt('반려 사유를 입력하세요.');
                if (!reason) return;
                await rejectExchange(r.id, { reason });
                patchExchangeRow(r.id, { status: 'REJECTED', reasonText: reason });
                if (r.orderId) updateGlobalOrderStatus(r.orderId, 'DELIVERED');
                alert('반려 처리되었습니다.');
                removeExchangeRow(r.id);
                setGlobalForceRefresh(true);
                // load();
              })();
            }}
          >
            반려
          </Button>

          {/* 운송장등록 */}
          <Button
            variant="primary" size="sm"
            onClick={(e) => {
              e.stopPropagation();
              (async () => {
                try {
                  // 1) 아직 신청이면 먼저 승인 (서버에 빈 JSON 본문 필수)
                  if (r.status === 'REQUESTED') {
                    await approveExchange(r.id, {});               // ⬅️ 서버 승인(DB 변경)
                    patchExchangeRow(r.id, { status: 'APPROVED' }); // UI 즉시 반영
                    if (r.orderId) updateGlobalOrderStatus(r.orderId, 'READY'); // 주문 탭도 '배송준비중'
                  }
                  // 2) 운송장 등록 모달 열기
                  setShipTarget({ ...r, status: 'APPROVED' });
                } catch (err) {
                  alert(err?.response?.data?.message || err?.message || '승인 처리 중 오류');
                }
              })();
            }}
          >운송장등록</Button>
        </div>
      ),
    }
  ]), [load, setGlobalForceRefresh])

  const selectedStatusItem = useMemo(() => {
    return ORDER_STATUS_CHIPS.find(chip => chip.value === status) || ORDER_STATUS_CHIPS[0];
  }, [status]);

  return (
    <div className="mx-auto w-full max-w-7xl lg:px-8">
      <h1 className="text-xl font-bold">주문 관리</h1>

      {/* 필터바 */}
      <section className={`${box} mb-4`}>
        <TableToolbar
          searchPlaceholder="주문번호/받는이/연락처 검색"
          searchValue={qInput}
          onChangeSearch={(v) => { setQInput(v); if (isComp) return }}
          onSubmitSearch={() => setParam({ q: qInput })}
          onReset={handleReset}
          right={
            !isExchange && (
              <Button size="md" className="ml-auto" variant="admin" onClick={handleDownloadExcel}>
                엑셀 다운로드
              </Button>
            )
          }
          statusChips={ORDER_STATUS_CHIPS}
          selectedStatus={status}
          onSelectStatus={(v) => setParam({ status: v })}
        >
        </TableToolbar>

      </section>

      {/* 목록 */}
      <section className={box}>
        {isExchange ? (
          <BaseTable
            columns={exchangeColumns}
            data={rows}
            rowKey="id"
            emptyText={loading ? '불러오는 중…' : (error || '교환 대기 건이 없습니다.')}
            scrollY={SCROLL_Y}
          />
        ) : (
          <BaseTable
            columns={orderColumns}
            data={rows}
            rowKey="id"
            withCheckbox
            selectedRowKeys={Array.from(selected)}
            onToggleRow={(key, checked) => {
              setSelected(prev => {
                const next = new Set(prev)
                checked ? next.add(key) : next.delete(key)
                return next
              })
            }}
            onToggleAll={(checked) => {
              const ids = rows.map(r => r.id)
              setSelected(checked ? new Set(ids) : new Set())
            }}
            onRowClick={openDetail}
            emptyText={loading ? '불러오는 중…' : (error || '데이터가 없습니다.')}
            scrollY={SCROLL_Y}
          />
        )}
      </section>

      {/* 상세 모달 */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="주문 상세">
        {detailRow ? <OrderDetailContent row={detailRow} /> : <div className="p-4">불러오는 중…</div>}
      </Modal>

      {/* 교환 상세 모달 (이미지 + 사유) */}
      <Modal isOpen={exDetailOpen} onClose={() => setExDetailOpen(false)} title="교환 상세">
        {!exDetail ? (
          <div className="p-4">불러오는 중…</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* 상단 기본 정보 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-sm text-gray-500">주문번호</div>
                <div className="rounded-lg border p-3">{exDetail.orderUid || '-'}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">상품명</div>
                <div className="rounded-lg border p-3">{exDetail.productName || '-'}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">받는이</div>
                <div className="rounded-lg border p-3">{exDetail.receiver || '-'}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">연락처</div>
                <div className="rounded-lg border p-3">{exDetail.phone || '-'}</div>
              </div>
              <div className="col-span-2">
                <div className="mb-1 text-sm text-gray-500">주소</div>
                <div className="rounded-lg border p-3">{exDetail.address || '-'}</div>
              </div>
              <div className="col-span-2">
                <div className="mb-1 text-sm text-gray-500">배송요청사항</div>
                <div className="rounded-lg border p-3">{exDetail.deliveryMemo || '-'}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">상태</div>
                <div className="rounded-lg border p-3">{getExchangeStatusLabel(exDetail.status) || '-'}</div>
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-500">신청일</div>
                <div className="rounded-lg border p-3">{formatDateTime(exDetail.createdAt) || '-'}</div>
              </div>
            </div>

            {/* 교환 사유 */}
            <div>
              <div className="mb-1 text-sm text-gray-500">교환 사유</div>
              <div className="rounded-lg border p-3 whitespace-pre-wrap">{exDetail.reasonText || '-'}</div>
            </div>

            {/* 이미지 갤러리 */}
            <div>
              <div className="mb-1 text-sm text-gray-500">첨부 이미지</div>
              {Array.isArray(exDetail.photos) && exDetail.photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {exDetail.photos.map((src, i) => (
                    <img key={i} src={src} alt={`ex-photo-${i}`} className="h-24 w-24 rounded-lg border object-cover" />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border p-3 text-gray-500">이미지가 없습니다.</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 교환 발송 등록 모달 */}
      <ExchangeShipDialog
        open={!!shipTarget}
        onClose={() => setShipTarget(null)}
        onSubmit={async ({ courierCode, trackingNumber }) => {
          if (!shipTarget) return
          await shipExchange(
            shipTarget.id,
            { courierCode, trackingNumber, carrier: courierCode, invoiceNo: trackingNumber }
          )
          patchExchangeRow(shipTarget.id, { status: 'REPLACEMENT_SHIPPED' });
          removeExchangeRow(shipTarget.id);
          alert('교환 발송이 등록되었습니다.')
          setGlobalForceRefresh(true)
          setShipTarget(null)
          load()
        }}
      />
    </div>
  )
}
