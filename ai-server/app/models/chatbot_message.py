from sqlalchemy import Column, Integer, String, Text, DateTime, Enum
from sqlalchemy.sql import func
from app.utils.database import Base
import enum

class RoleEnum(enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"

class ChatbotMessage(Base):
    __tablename__ = "chatbot_message"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(100), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
