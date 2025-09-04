from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.chatbot_message import ChatbotMessage, RoleEnum


def save_chat_message(db: Session, user_id: str, role: RoleEnum, content: str) -> None:
    """
    채팅 메시지 저장. 커밋 실패 시 롤백으로 세션 복구.
    """
    message = ChatbotMessage(user_id=user_id, role=role, content=content)
    db.add(message)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise


def get_recent_messages(db: Session, user_id: str, limit: int = 6):
    """
    최근 N개를 시간 오름차순으로 반환 (프롬프트용).
    DESC로 N개 가져온 뒤 역순.
    """
    rows = (
        db.query(ChatbotMessage)
        .filter(ChatbotMessage.user_id == user_id)
        .order_by(ChatbotMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(rows))


def get_chat_history(db: Session, user_id: str):
    """
    전체 히스토리 시간 오름차순.
    """
    return (
        db.query(ChatbotMessage)
        .filter(ChatbotMessage.user_id == user_id)
        .order_by(ChatbotMessage.created_at.asc())
        .all()
    )
