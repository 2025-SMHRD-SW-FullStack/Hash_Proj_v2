from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from app.services.state import init_session, get_ctx
from app.services.chatbot import reply_once, accept_now, edit_summary

app = FastAPI(title="Meonjeo Interview Chatbot", version="0.3.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

class CreateSession(BaseModel):
    user_id: int
    order_item_id: int
    product_id: int | None = None

class ReplyReq(BaseModel):
    user_id: int
    text: str

class AcceptReq(BaseModel):
    user_id: int

class EditReq(BaseModel):
    user_id: int
    instructions: str

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/api/ai/chat/session")
def create_session(req: CreateSession, authorization: str | None = Header(default=None)):
    ok, first_question = init_session(
        user_id=req.user_id,
        order_item_id=req.order_item_id,
        product_id=req.product_id,
        bearer=authorization,
    )
    if not ok:
        raise HTTPException(status_code=400, detail=first_question or "피드백 작성이 불가합니다.")
    return {
        "session_id": str(req.user_id),
        "first_question": first_question,
        "step": get_ctx(str(req.user_id)).get("stage"),
    }

@app.post("/api/ai/chat/reply")
def chat_reply(req: ReplyReq, authorization: str | None = Header(default=None)):
    return reply_once(user_id=str(req.user_id), user_text=req.text, bearer=authorization)

@app.post("/api/ai/chat/accept")
def accept_summary(req: AcceptReq, authorization: str | None = Header(default=None)):
    ok, msg = accept_now(user_id=str(req.user_id), bearer=authorization)
    if not ok:
        raise HTTPException(status_code=400, detail=msg or "요약 승인/제출 실패")
    return {"ok": True, "message": msg}

@app.post("/api/ai/chat/edit")
def edit_summary_api(req: EditReq):
    return edit_summary(user_id=str(req.user_id), instructions=req.instructions)
