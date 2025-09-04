from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1")  # 필요시 환경변수로 교체 가능 (예: gpt-4o, gpt-4o-mini)

def call_chatgpt(
    user_id: int,
    system_prompt: str,
    user_prompt: str,
    chat_history: list[dict] | None = None,
    temperature: float = 0.3,
    max_tokens: int = 1200,
) -> str:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    if chat_history:
        messages += chat_history
    messages.append({"role": "user", "content": user_prompt})

    resp = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return (resp.choices[0].message.content or "").strip()
