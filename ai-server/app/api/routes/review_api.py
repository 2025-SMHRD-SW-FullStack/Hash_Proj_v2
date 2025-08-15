from fastapi import APIRouter, Header, HTTPException, Depends, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from sqlalchemy.orm import Session

from app.services.review_generation_service import ReviewGenerationService
from app.services.style_analysis_service import StyleAnalysisService
from app.utils.jwt import verify_jwt_token
from app.utils.database import get_db

router = APIRouter(tags=["Review"])

# ---------- Pydantic 모델 ----------

class GenerateRequest(BaseModel):
    missionId: int = Field(..., description="미션 ID")
    platform: Optional[str] = Field(None, description="NAVER_STORE/COUPANG/BAEMIN/ELEVEN_ST 등")
    keywords: Optional[List[str]] = Field(default_factory=list, description="선택 옵션을 키워드로 전달")
    imageUrls: Optional[List[str]] = Field(default_factory=list, description="선택 사진 URL들(/static 또는 /uploads 등)")
    userSystemPrompt: Optional[str] = Field(None, description="(선택) 사용자 스타일 프롬프트")
    charLimit: Optional[int] = Field(None, description="(선택) 글자 수 상한(플랫폼 정책이 우선됨)")
    previousPrompt: Optional[str] = Field(None, description="(선택) 직전 생성 때 사용했던 프롬프트 요약/원문")

class GenerateResponse(BaseModel):
    content: str
    usedSystemPrompt: str
    usedUserPrompt: str
    model: str
    meta: Dict = {}

class RegenerateRequest(BaseModel):
    missionId: int
    platform: Optional[str] = None
    keywords: Optional[List[str]] = Field(default_factory=list)
    imageUrls: Optional[List[str]] = Field(default_factory=list)
    # 1) 사용자가 직접 수정한 텍스트를 seed로
    baseEditedText: Optional[str] = Field(None, description="유저가 손으로 고친 리뷰 본문")
    # 2) 사용자가 입력한 프롬프트로 재생성
    customPrompt: Optional[str] = Field(None, description="유저 입력 프롬프트")
    # 정책 override (선택)
    charLimit: Optional[int] = None
    previousPrompt: Optional[str] = None
    userSystemPrompt: Optional[str] = None

class AnalyzeStyleRequest(BaseModel):
    texts: List[str] = Field(default_factory=list, description="사용자 과거 리뷰 텍스트 샘플")
    imageUrls: List[str] = Field(default_factory=list, description="스크린샷 이미지 URL(있으면 OCR로 텍스트 추출 가능)")

class AnalyzeStyleResponse(BaseModel):
    toneLabel: str
    styleTags: List[str]
    systemPrompt: str
    consumedSamples: int

# ---------- 라우트 ----------

@router.post("/review/generate", response_model=GenerateResponse, summary="리뷰 생성(옵션/사진 없어도 OK)")
def generate(req: GenerateRequest, authorization: str = Header(...), db: Session = Depends(get_db)):
    user_id = verify_jwt_token(authorization)
    result = ReviewGenerationService().generate(
        user_id=user_id,
        mission_id=req.missionId,
        platform=req.platform,
        keywords=req.keywords or [],
        image_urls=req.imageUrls or [],
        user_system_prompt=req.userSystemPrompt,
        char_limit=req.charLimit,
        previous_prompt=req.previousPrompt,
    )
    return JSONResponse(content=result)

@router.post("/review/regenerate", response_model=GenerateResponse, summary="리뷰 재생성(편집본/커스텀 프롬프트)")
def regenerate(req: RegenerateRequest, authorization: str = Header(...), db: Session = Depends(get_db)):
    user_id = verify_jwt_token(authorization)
    # 재생성 횟수 제한(3회)은 **자바 백엔드에서** 검증하고, ai-server는 요청만 처리
    result = ReviewGenerationService().regenerate(
        user_id=user_id,
        mission_id=req.missionId,
        platform=req.platform,
        keywords=req.keywords or [],
        image_urls=req.imageUrls or [],
        base_edited_text=req.baseEditedText,
        custom_prompt=req.customPrompt,
        user_system_prompt=req.userSystemPrompt,
        char_limit=req.charLimit,
        previous_prompt=req.previousPrompt,
    )
    return JSONResponse(content=result)

@router.post("/ai/style/analyze", response_model=AnalyzeStyleResponse, summary="사용자 톤/스타일 분석")
def analyze_style(req: AnalyzeStyleRequest, authorization: str = Header(...), db: Session = Depends(get_db)):
    user_id = verify_jwt_token(authorization)
    result = StyleAnalysisService().analyze(user_id=user_id, texts=req.texts, image_urls=req.imageUrls)
    return JSONResponse(content=result)
