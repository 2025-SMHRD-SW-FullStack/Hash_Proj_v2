import os, uuid
from datetime import datetime
from typing import Tuple
from fastapi import UploadFile

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")  # 필요시 .env에서 변경

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def save_upload_file(file: UploadFile, subdir: str = "") -> Tuple[str, int, str]:
    """
    파일을 디스크에 저장하고 (절대)경로, 크기, MIME을 반환
    저장 경로: {UPLOAD_DIR}/{subdir}/{yyyy}/{mm}/{dd}/{uuid}.{ext}
    """
    date_path = datetime.utcnow().strftime("%Y/%m/%d")
    base = os.path.join(UPLOAD_DIR, subdir, date_path)
    ensure_dir(base)

    name, ext = os.path.splitext(file.filename or "")
    fname = f"{uuid.uuid4().hex}{ext}"
    abspath = os.path.abspath(os.path.join(base, fname))

    size = 0
    # chunk 저장 (대용량 대응)
    with open(abspath, "wb") as out:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            out.write(chunk)
    # 포인터 원복(필요 시)
    try:
        file.file.seek(0)
    except Exception:
        pass

    mime = file.content_type or "application/octet-stream"
    return abspath, size, mime
