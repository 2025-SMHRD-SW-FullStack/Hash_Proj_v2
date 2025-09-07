// 서버 응답 스키마 편차를 한 번에 흡수해서 UI가 항상 동일한 형태로 쓰도록 정규화

// 최소 별칭만 유지
const CARRIER_ALIASES = {
  "CJ": "CJ대한통운", "CJLOGISTICS": "CJ대한통운", "CJ_LOGISTICS": "CJ대한통운", "CJ대한통운": "CJ대한통운",
  "LOTTE": "롯데택배", "LOTTEGLOBAL": "롯데택배", "롯데": "롯데택배", "롯데택배": "롯데택배",
  "HANJIN": "한진택배", "한진": "한진택배", "한진택배": "한진택배",
  "KOREAPOST": "우체국택배", "EPOST": "우체국택배", "KOREA POST": "우체국택배", "우체국": "우체국택배", "우체국택배": "우체국택배",
  "LOGEN": "로젠택배", "로젠": "로젠택배", "로젠택배": "로젠택배",
};
const canonCarrierName = (s) => {
  if (!s) return null;
  const raw = String(s).trim();
  const key = raw.toUpperCase().replace(/[\s_-]+/g, "");
  return CARRIER_ALIASES[key] || CARRIER_ALIASES[raw] || raw;
};

const toIsoLike = (t) => {
  if (t == null) return null;
  if (typeof t === "number") return new Date(t).toISOString();
  let s = String(t).trim();
  if (!s) return null;
  // 2025-09-07 14:20 / 2025.09.07 14:20 / 2025/09/07 14:20 → ISO-like
  s = s.replace(/[./]/g, "-").replace(" ", "T");
  return s;
};

const normalizeOneEvent = (e) => {
  if (!e) return null;
  if (typeof e === "string") {
    const s = e.trim();
    return s ? { time: null, timeText: "", where: "", location: "", label: s, status: s, description: "", level: 3, raw: e } : null;
  }
  if (typeof e !== "object") return null;

  const timeRaw =
    e.time ?? e.timeText ?? e.timeString ?? e.occurredAt ?? e.datetime ?? e.dateTime ?? e.createdAt ?? e.scanTime ?? null;
  const where = e.where ?? e.location ?? e.area ?? e.branch ?? e.place ?? e.office ?? "";
  const label =
    e.label ?? e.statusText ?? e.status ?? e.kind ?? e.message ?? e.description ?? e.detail ?? e.msg ?? "";
  const status = e.status ?? e.statusText ?? e.label ?? e.kind ?? "";
  const description = e.description ?? e.detail ?? e.msg ?? "";
  const level = Number(e.level ?? e.step ?? e.state ?? 3) || 3;

  return {
    time: toIsoLike(timeRaw),
    timeText: e.timeText ?? e.timeString ?? (timeRaw || ""),
    where,
    location: where,
    label,
    status,
    description,
    level,
    raw: e,
  };
};

const ensureArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []);

const pickFirst = (obj, paths = []) => {
  for (const p of paths) {
    const segs = p.split(".");
    let cur = obj;
    for (const s of segs) {
      if (!cur) break;
      cur = cur[s];
    }
    if (cur != null) return cur;
  }
  return null;
};

export const normalizeTracking = (raw) => {
  const obj = (raw && typeof raw === "object") ? raw : {};

  // carrier
  const carrierCode = obj.carrierCode ?? obj.courierCode ?? obj.code ?? null;
  const carrierRaw =
    obj.carrierName ?? obj.courierName ?? obj.companyName ??
    obj.carrier ?? obj.courier ?? obj.company ?? carrierCode ?? null;
  const carrierName = canonCarrierName(carrierRaw) || null;

  // invoice
  const invoiceNo = obj.invoiceNo ?? obj.trackingNo ?? obj.trackingNumber ?? obj.invoice ?? null;

  // 다양한 이벤트 배열 후보
  const arrayCandidates = [
    "events",
    "trackingDetails",
    "details",
    "progresses",
    "progress",
    "scanDetails",
    "timeline",
    "logs",
    "history",
    "records",
    "list",
    "items",
    "checkpoints",
    // 중첩 컨테이너
    "result.events",
    "result.trackingDetails",
    "result.progresses",
    "result.history",
    "data.events",
    "data.trackingDetails",
    "data.progresses",
    "data.history",
    "payload.events",
    "payload.trackingDetails",
  ];

  let src =
    pickFirst(obj, arrayCandidates) ??
    // 배열 후보가 전혀 없으면 단일 이벤트 후보라도 주워서 배열로
    ensureArray(
      pickFirst(obj, [
        "lastEvent",
        "lastDetail",
        "lastStatus",
        "latest",
        "result.lastEvent",
        "data.lastEvent",
      ])
    );

  // 배열/문자열/객체 모두 normalize
  let events = [];
  if (Array.isArray(src)) {
    events = src.map(normalizeOneEvent).filter(Boolean);
  } else if (typeof src === "string" || typeof src === "object") {
    const one = normalizeOneEvent(src);
    if (one) events = [one];
  }

  // 배송완료 힌트로 합성 이벤트 보강
  const deliveredFlag =
    obj.complete === true || obj.completed === true ||
    obj.delivered === true || String(obj.status || "").toLowerCase() === "delivered";
  const deliveredAt = obj.deliveredAt ?? obj.completeAt ?? obj.completedAt ?? obj.finishedAt ?? null;

  if (events.length === 0 && (deliveredFlag || deliveredAt)) {
    events = [{
      time: toIsoLike(deliveredAt) || null,
      timeText: deliveredAt ? String(deliveredAt) : "",
      where: "",
      location: "",
      label: "배송완료",
      status: "배송완료",
      description: "",
      level: 5,
      raw: { synthesized: true }
    }];
  }

  // 시간 오름차순 정렬
  events.sort((a, b) => {
    const da = a.time ? new Date(a.time).getTime() : Infinity;
    const db = b.time ? new Date(b.time).getTime() : Infinity;
    return da - db;
  });

  // 현재 레벨 보정
  let currentLevel = Number(obj.currentLevel ?? obj.level) || null;
  if (!currentLevel) {
    if (deliveredFlag) currentLevel = 5;
    else if (events.length) currentLevel = Number(events[events.length - 1].level || 3) || 3;
    else currentLevel = 3;
  }

  // 개발 시 원인 파악용 로그 (프로덕션 번들에서는 제거됨)
  try { if (import.meta?.env?.DEV && events.length === 0) console.debug("[tracking] no events. raw=", obj); } catch {}

  return {
    carrier: { code: carrierCode || null, name: carrierName || null },
    carrierName: carrierName || null,  // 호환
    invoiceNo: invoiceNo || null,
    currentLevel,
    lastSyncedAt: obj.lastSyncedAt ?? obj.syncedAt ?? null,
    events,
    raw: obj,
  };
};
