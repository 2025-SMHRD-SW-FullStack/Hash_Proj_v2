# ============================================================================
# IntelliJ / Java 연동 안내
# - 이 파일의 각 엔드포인트 위쪽에 WebClient 코드 예시가 있습니다.
# - Authorization: "Bearer <userId:int>" (현재 모킹) 형태로 전달하세요.
# - 응답 모델은 아래 Pydantic 클래스를 참고(또는 Map으로 받아도 됩니다).
# ============================================================================

from fastapi import APIRouter, Header, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel, Field, AnyHttpUrl
from typing import List, Optional, Dict
from sqlalchemy.orm import Session

from app.services.review_generation_service import ReviewGenerationService  # 리뷰 본문 생성 서비스
from app.services.style_analysis_service import StyleAnalysisService        # 말투/스타일 분석 서비스(콜드스타트/예시 기반)
from app.utils.jwt import verify_jwt_token, JWTUser                         # 간단 JWT 모킹(Authorization: Bearer <userId>)
from app.utils.database import get_db                                       # SQLAlchemy 세션 의존성 주입
from app.store import examples_store                                        # 플랫폼 예시(.txt + index.yaml)
from app.store import profile_store_db                                      # 사용자 프로필 DB 저장소

from app.utils.storage import save_upload_file
from app.store.db_models import ReviewInputImage

# >>> URL 크롤링에 필요한 import (Playwright + 정적 파싱 통합 유틸)
from app.services.link_extract import fetch_texts_from_url_async

import asyncio, yaml, os,  json, uuid


router = APIRouter(tags=["Review"])

# ---- Pydantic 모델(요청/응답) ------------------------------------------------
class IngestByUrlRequest(BaseModel):
    urls: List[AnyHttpUrl] = Field(default_factory=list, description="리뷰 페이지 URL 목록")
    maxSamples: int = Field(20, ge=1, le=50, description="총 학습 샘플 상한")
    cookie: Optional[str] = None
    
class StyleIn(BaseModel):
    # 생성 시 강제로 톤/시스템프롬프트를 덮어쓰고 싶을 때 사용(일반적으론 필요 없음)
    toneLabel: Optional[str] = None
    systemPrompt: Optional[str] = None

class GenerateRequest(BaseModel):
    # 리뷰 생성에 필요한 입력 값
    platform: Optional[str] = Field(None, description="instagram|naver_blog|kakao|coupang|google_maps|baemin|smartstore|...")
    brand: Optional[str] = None  # 매장/브랜드명
    menu: Optional[str] = None   # 메뉴/상품명
    keywords: Optional[List[str]] = None  # 핵심 키워드
    points: Optional[List[str]] = None    # 포인트(키워드와 유사, 있으면 우선)
    desiredLength: Optional[int] = Field(None, description="원하는 글자 수")
    style: Optional[StyleIn] = None       # 강제 스타일 덮어쓰기(선택)
    # DB나 직접 경로/URL로 이미지 넘길 수 있게 옵션 제공
    imageRequestId: Optional[str] = Field(None, description="ai-server에 저장된 업로드 묶음 식별자")
    imageIds: Optional[List[int]] = Field(None, description="review_input_image.id 배열")
    imagePaths: Optional[List[str]] = Field(None, description="서버 로컬 경로 배열(직접 전달 시)")
    imageUrls: Optional[List[str]] = Field(None, description="접근 가능한 이미지 URL 배열")

class GenerateResponse(BaseModel):
    # 생성 결과 포맷
    platform: str
    limit: int
    tone: str
    content: str
    keywordsUsed: List[str]
    imageRequestId: Optional[str] = None
    imagePaths: Optional[List[str]] = None

class StyleAnalyzeRequest(BaseModel):
    # 사용자 과거 리뷰 샘플 업로드(학습 입력)
    samples: List[str] = Field(default_factory=list, description="사용자 리뷰 예시 텍스트")

class StyleAnalyzeResponse(BaseModel):
    # 샘플을 분석한 톤/지침/태그(요약)
    toneLabel: str
    styleTags: List[str]
    systemPrompt: str
    consumedSamples: int

class IngestRequest(BaseModel):
    # 샘플 학습(저장) 요청 바디
    samples: List[str] = Field(default_factory=list)
    platform: Optional[str] = None  # 사용 안 함(확장 여지)

class ProfileResponse(BaseModel):
    # DB에 저장된 사용자 프로필 조회 응답
    userId: int
    toneLabel: Optional[str] = None
    systemPrompt: Optional[str] = None
    styleTags: List[str] = []
    historyCount: int = 0

class RegenerateRequest(GenerateRequest):
    # 프롬프트 기반 재생성 요청(단일 후보용)
    instructions: Optional[str] = Field(None, description="추가 지시문(톤/길이/스타일 등)")
    forbidWords: Optional[List[str]] = Field(default=None, description="금칙어 목록")
    rewriteFrom: Optional[str] = Field(default=None, description="기존 본문을 참고하여 다시 생성")
    # numCandidates는 사용하지 않음(단일 후보 정책)
    # numCandidates: Optional[int] = Field(default=1, ge=1, le=5, description="대안 후보 개수(최대 5)")

EXAMPLES_PATH = os.getenv("EXAMPLES_PATH", "data/examples.yaml")

def _resolve_image_paths(db: Session, user_id: int, req: GenerateRequest) -> List[str]:
    paths: List[str] = []

    # 1) request_id 로 묶음 조회
    if req.imageRequestId:
        rows = (
            db.query(ReviewInputImage)
              .filter(ReviewInputImage.request_id == req.imageRequestId,
                      ReviewInputImage.user_id == user_id)
              .all()
        )
        paths.extend([r.stored_path for r in rows])

    # 2) 개별 id 로 조회
    if req.imageIds:
        if len(req.imageIds) > 0:
            rows = (
                db.query(ReviewInputImage)
                  .filter(ReviewInputImage.id.in_(req.imageIds),
                          ReviewInputImage.user_id == user_id)
                  .all()
            )
            paths.extend([r.stored_path for r in rows])

    # 3) 클라이언트가 직접 준 경로/URL도 수용(힌트용)
    if req.imagePaths:
        paths.extend(req.imagePaths)
    if req.imageUrls:
        paths.extend(req.imageUrls)

    # 4) 중복 제거 + 상한
    dedup, seen = [], set()
    for p in paths:
        if p and p not in seen:
            dedup.append(p); seen.add(p)
    return dedup[:20]  # 너무 많으면 컷


# -----------------------------------------------------------------------------
# 리뷰 생성
# - 흐름: ① 사용자 프로필(DB) 적용 → ② 플랫폼 예시(index.yaml 가중치/태그) → ③ 기본 템플릿
# -----------------------------------------------------------------------------
@router.post("/reviews/generate", response_model=GenerateResponse)
def generate_review(req: GenerateRequest, Authorization: Optional[str] = Header(None)):
    user: JWTUser = verify_jwt_token(Authorization)
    service = ReviewGenerationService()
    style_override: Dict = {}

    # DB 세션 열고: 프로필 로드 + 이미지 경로 해석
    resolved_paths: List[str] = []
    for _db in get_db():
        db: Session = _db

        prof = profile_store_db.load(db, user.user_id) if user else None
        if prof:
            style_override = {
                "toneLabel": prof.get("toneLabel"),
                "systemPrompt": prof.get("systemPrompt"),
            }
        else:
            entries = examples_store.list_entries(req.platform) if req.platform else []
            if entries:
                analyzed = StyleAnalysisService().analyze_entries(entries)
                style_override = {
                    "toneLabel": analyzed.get("toneLabel"),
                    "systemPrompt": analyzed.get("systemPrompt")
                }

        # ★ 여기서 DB에서 이미지 경로/URL을 해석
        resolved_paths = _resolve_image_paths(db, user.user_id, req)
        break

    # 생성 실행(이미지 힌트가 반영되도록 payload에 주입)
    payload = req.dict()
    payload["imagePaths"] = resolved_paths

    result = service.generate(payload, style_override=style_override or None)
    # 응답에 이번 요청에서 쓰인 이미지도 같이 내려줌(디버깅/추적 편의)
    return GenerateResponse(**result,
                           imageRequestId=req.imageRequestId,
                           imagePaths=resolved_paths or None)


@router.post("/reviews/generate-mp", response_model=GenerateResponse)
async def generate_review_with_images(
    Authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
    # ---- 폼 필드(원래 JSON을 폼으로) ----
    platform: Optional[str] = Form(None),
    brand: Optional[str] = Form(None),
    menu: Optional[str] = Form(None),
    keywords: Optional[str] = Form(None),      # JSON 배열/혹은 콤마구분 둘 다 허용
    points: Optional[str] = Form(None),        # JSON 배열/혹은 콤마구분 둘 다 허용
    desiredLength: Optional[int] = Form(None),
    toneLabel: Optional[str] = Form(None),
    systemPrompt: Optional[str] = Form(None),
    # ---- 파일들 ----
    images: Optional[List[UploadFile]] = File(None)
):
    # 0) 사용자 확인(현재는 Bearer <userId>)
    user = verify_jwt_token(Authorization)
    user_id = user.user_id

    # 1) 파일 저장(+DB 기록)
    request_id = uuid.uuid4().hex
    stored_paths: list[str] = []
    if images:
        for f in images:
            path, size, mime = save_upload_file(f, subdir="review")
            stored_paths.append(path)
            row = ReviewInputImage(
                user_id=user_id,
                request_id=request_id,
                original_name=f.filename or None,
                stored_path=path,
                mime_type=mime,
                size_bytes=size
            )
            db.add(row)
        db.flush()  # id 발급

    # 2) 폼 문자열 → 리스트 파싱
    def parse_list(s: Optional[str]) -> list[str]:
        if not s:
            return []
        s = s.strip()
        if s.startswith("["):
            try:
                return list(json.loads(s))
            except Exception:
                return []
        # 콤마 구분 허용
        return [t.strip() for t in s.split(",") if t.strip()]

    payload = {
        "platform": platform,
        "brand": brand,
        "menu": menu,
        "keywords": parse_list(keywords),
        "points": parse_list(points),
        "desiredLength": desiredLength,
        "style": {
            "toneLabel": toneLabel,
            "systemPrompt": systemPrompt
        } if (toneLabel or systemPrompt) else None,
        "imagePaths": stored_paths
    }

    # 3) 사용자 말투 프로필/예시 적용 + 생성
    service = ReviewGenerationService()

    # (선택) DB에 저장된 사용자 프로필 반영
    style_override = None
    try:
        from app.store import profile_store_db
        prof = profile_store_db.load(db, user.user_id) if user.user_id else None
        if prof:
            style_override = {"toneLabel": prof.get("toneLabel"), "systemPrompt": prof.get("systemPrompt")}
    except Exception:
        pass

    gen = service.generate(payload, style_override=style_override)

    return GenerateResponse(
        **gen,
        imageRequestId=request_id if stored_paths else None,
        imagePaths=stored_paths or None
    )


# -----------------------------------------------------------------------------
# 샘플 분석(미리보기 용)
# - 프론트에서 업로드 전 샘플을 넣고 톤/태그/지침을 미리 확인할 때 사용
# -----------------------------------------------------------------------------
@router.post("/style/analyze", response_model=StyleAnalyzeResponse)
def analyze_style(req: StyleAnalyzeRequest, Authorization: Optional[str] = Header(None)):
    user: JWTUser = verify_jwt_token(Authorization)
    svc = StyleAnalysisService()
    result = svc.analyze(req.samples)
    return StyleAnalyzeResponse(**result)

# -----------------------------------------------------------------------------
# 샘플 학습(영구 저장)
# - 사용자 말투 프로필을 DB에 저장/갱신(중복 제거, 최근 50개 유지)
# -----------------------------------------------------------------------------
@router.post("/style/ingest", response_model=ProfileResponse)
def ingest_style(req: IngestRequest,
                 Authorization: Optional[str] = Header(None),
                 db: Session = Depends(get_db)):

    user: JWTUser = verify_jwt_token(Authorization)
    if not user or not user.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    samples = [s.strip() for s in (req.samples or []) if s and s.strip()]

    existing = profile_store_db.load(db, user.user_id) or {"history": []}
    base_history = existing.get("history") or []
    combined = (base_history + samples)[-profile_store_db.MAX_HISTORY:]

    if not combined:
        prof = existing
        return ProfileResponse(
            userId=user.user_id,
            toneLabel=prof.get("toneLabel"),
            systemPrompt=prof.get("systemPrompt"),
            styleTags=prof.get("styleTags") or [],
            historyCount=len(base_history)
        )

    analyzed = StyleAnalysisService().analyze(combined)

    prof = profile_store_db.update_with_samples(
        db,
        user_id=user.user_id,
        tone_label=analyzed["toneLabel"],
        system_prompt=analyzed["systemPrompt"],
        style_tags=analyzed["styleTags"],
        samples=samples
    )

    return ProfileResponse(
        userId=user.user_id,
        toneLabel=prof.get("toneLabel"),
        systemPrompt=prof.get("systemPrompt"),
        styleTags=prof.get("styleTags") or [],
        historyCount=len(prof.get("history") or [])
    )



# -----------------------------------------------------------------------------
# URL 기반 샘플 학습 (Playwright 지원)
# - 네이버플레이스(모바일) 등 리뷰 페이지 URL을 주면 서버가 HTML/렌더링 결과를
#   가져와 텍스트를 추출한 뒤 곧바로 학습(DB 저장)합니다.
# -----------------------------------------------------------------------------
@router.post("/style/ingestByUrl", response_model=ProfileResponse)
async def ingest_style_by_url(
    req: IngestByUrlRequest,
    Authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user: JWTUser = verify_jwt_token(Authorization)
    if not user or not user.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not req.urls:
        raise HTTPException(status_code=400, detail="urls is empty")

    # 요청당 URL 개수 상한
    max_urls = int(os.getenv("CRAWL_MAX_URLS", "10"))
    urls = req.urls[:max_urls]

    # 1) 병렬 수집 (Playwright 우선 → 정적 폴백)
    per_page = int(os.getenv("CRAWL_MAX_SAMPLES_PER_PAGE", "5"))
    timeout_ms = int(os.getenv("CRAWL_TIMEOUT_MS", "30000"))
    results = await asyncio.gather(
        *[fetch_texts_from_url_async(str(u), per_page, timeout_ms, req.cookie) for u in urls],
        return_exceptions=True
    )

    # 2) 텍스트 취합 → 정제/중복 제거 → 상한 적용
    samples: List[str] = []
    for res in results:
        if isinstance(res, Exception):
            continue
        samples.extend(res or [])

    samples = [s.strip() for s in samples if s and s.strip()]
    # 순서 유지 중복 제거
    seen, dedup = set(), []
    for t in samples:
        if t not in seen:
            seen.add(t); dedup.append(t)
    samples = dedup[: max(1, min(50, req.maxSamples))]

    # ✅ 기존 히스토리와 결합해 분석(원칙 준수)
    existing = profile_store_db.load(db, user.user_id) or {"history": []}
    base_history = existing.get("history") or []
    combined = (base_history + samples)[-profile_store_db.MAX_HISTORY:]

    if not combined:
        prof = existing
        return ProfileResponse(
            userId=user.user_id,
            toneLabel=prof.get("toneLabel"),
            systemPrompt=prof.get("systemPrompt"),
            styleTags=prof.get("styleTags") or [],
            historyCount=len(base_history)
        )

    analyzed = StyleAnalysisService().analyze(combined)

    # 3) DB 저장: 신규 샘플은 history에 append, 분석 결과는 덮어쓰기
    prof = profile_store_db.update_with_samples(
        db,
        user_id=user.user_id,
        tone_label=analyzed["toneLabel"],
        system_prompt=analyzed["systemPrompt"],
        style_tags=analyzed["styleTags"],
        samples=samples
    )

    return ProfileResponse(
        userId=user.user_id,
        toneLabel=prof.get("toneLabel"),
        systemPrompt=prof.get("systemPrompt"),
        styleTags=prof.get("styleTags") or [],
        historyCount=len(prof.get("history") or [])
    )



# -----------------------------------------------------------------------------
# 내 프로필 조회
# - 생성 전에 현재 적용될 사용자 톤/지침을 확인하려고 조회
# -----------------------------------------------------------------------------
@router.get("/style/profile", response_model=ProfileResponse)
def get_profile(Authorization: Optional[str] = Header(None)):
    user: JWTUser = verify_jwt_token(Authorization)
    if not user or not user.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    for _db in get_db():
        db: Session = _db
        prof = profile_store_db.load(db, user.user_id) or {"userId": user.user_id, "history": []}
        break

    return ProfileResponse(
        userId=prof.get("userId"),
        toneLabel=prof.get("toneLabel"),
        systemPrompt=prof.get("systemPrompt"),
        styleTags=prof.get("styleTags") or [],
        historyCount=len(prof.get("history") or [])
    )

# -----------------------------------------------------------------------------
# 전역 예시 관리(레거시): 필요 없으면 라우트 숨겨도 됨
# -----------------------------------------------------------------------------
class ExampleItem(BaseModel):
    id: str
    text: str
    tags: List[str] = []

class SaveExamplesRequest(BaseModel):
    items: List[ExampleItem]

def _ensure_data_dir():
    os.makedirs(os.path.dirname(EXAMPLES_PATH), exist_ok=True)
    if not os.path.exists(EXAMPLES_PATH):
        with open(EXAMPLES_PATH, "w", encoding="utf-8") as f:
            yaml.safe_dump({"items": []}, f, allow_unicode=True)

@router.get("/examples", response_model=SaveExamplesRequest)
def list_examples():
    _ensure_data_dir()
    with open(EXAMPLES_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {"items": []}
    items = data.get("items", [])
    return SaveExamplesRequest(items=[ExampleItem(**it) for it in items])

@router.post("/examples", response_model=SaveExamplesRequest)
def save_examples(req: SaveExamplesRequest):
    _ensure_data_dir()
    with open(EXAMPLES_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump({"items": [e.dict() for e in req.items]}, f, allow_unicode=True)
    return req

# -----------------------------------------------------------------------------
# 플랫폼 예시 관리(.txt + index.yaml)
# - 업로드: ZIP 내 .txt 파일들만 추출(동명 파일은 자동 리네임)
# -----------------------------------------------------------------------------
@router.get("/examples/platform/{platform}")
def list_platform_examples(platform: str):
    entries = examples_store.list_entries(platform)
    preview = [{
        "file": e["file"], "tags": e["tags"], "weight": e["weight"],
        "excerpt": (e["text"][:160] + ("..." if len(e["text"]) > 160 else ""))
    } for e in entries[:20]]
    return {"platform": platform, "count": len(entries), "samples": preview}

@router.post("/examples/platform/{platform}/upload")
async def upload_platform_examples(platform: str, file: UploadFile = File(...)):
    content = await file.read()
    res = examples_store.import_zip(platform, content)
    return res

# -----------------------------------------------------------------------------
# - 단일 후보 정책을 쓰는 경우 전체 블록을 주석 처리하세요.
# -----------------------------------------------------------------------------
# @router.post("/reviews/regenerate", response_model=RegenerateBatchResponse)
# def regenerate_review(req: RegenerateRequest, Authorization: Optional[str] = Header(None)):
#     """
#     프롬프트 기반 재생성(여러 후보).
#     - 키워드 순서를 회전시켜 미묘하게 다른 후보를 N개 반환(간단 변주).
#     """
#     ...
# -----------------------------------------------------------------------------
# 단일 재생성: 지시문/금칙어/기존 본문 반영, 후보 1개만 반환
# - 최종 경로는 prefix('/ai')가 붙어 **/ai/reviews/regenerate**
# -----------------------------------------------------------------------------
@router.post("/reviews/regenerate", response_model=GenerateResponse)  # <-- '/ai' 붙이지 말 것!
def regenerate_review_single(req: RegenerateRequest, Authorization: Optional[str] = Header(None)):
    """
    재생성(단일 후보).
    - numCandidates/후보 회전 로직 없이 한 개만 반환
    - instructions/forbidWords/rewriteFrom 반영(경량 규칙)
    """
    user: JWTUser = verify_jwt_token(Authorization)
    service = ReviewGenerationService()
    style_override: Dict = {}

    # ① 사용자 프로필(DB) 우선
    for _db in get_db():
        db: Session = _db
        prof = profile_store_db.load(db, user.user_id) if user else None
        break
    if prof:
        style_override = {"toneLabel": prof.get("toneLabel"), "systemPrompt": prof.get("systemPrompt")}
    else:
        # ② 플랫폼 예시(콜드스타트)
        entries = examples_store.list_entries(req.platform) if req.platform else []
        if entries:
            analyzed = StyleAnalysisService().analyze_entries(entries)
            style_override = {"toneLabel": analyzed.get("toneLabel"), "systemPrompt": analyzed.get("systemPrompt")}

    # ③ 생성 실행
    gen = service.generate(req.dict(), style_override=style_override or None)
    return GenerateResponse(**gen)
