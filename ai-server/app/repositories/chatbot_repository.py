from sqlalchemy.orm import Session
from app.models.chatbot_message import ChatbotMessage, RoleEnum

def save_chat_message(db: Session, user_id: str, role: RoleEnum, content: str):
    message = ChatbotMessage(user_id=user_id, role=role, content=content)
    db.add(message)
    db.commit()

def get_recent_messages(db: Session, user_id: str, limit: int = 6):
    return (
        db.query(ChatbotMessage)
        .filter(ChatbotMessage.user_id == user_id)
        .order_by(ChatbotMessage.created_at.desc())
        .limit(limit)
        .all()[::-1]
    )

def get_chat_history(db: Session, user_id: str):
    return (
        db.query(ChatbotMessage)
        .filter(ChatbotMessage.user_id == user_id)
        .order_by(ChatbotMessage.created_at.desc())   # ← timestamp → created_at
        .all()
    )
