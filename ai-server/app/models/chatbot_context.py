# app/models/chatbot_context.py
from sqlalchemy import Column, String, DateTime, func, JSON  # ← 핵심: JSON
from app.utils.database import Base

class ChatbotContext(Base):
    __tablename__ = "chatbot_context"

    user_id = Column(String(64), primary_key=True, index=True)
    ctx_json = Column(JSON, nullable=False)  # ← PostgreSQL/ MySQL/ SQLite 모두 호환
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
