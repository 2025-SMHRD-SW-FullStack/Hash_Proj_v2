import os, zipfile, yaml
from typing import List, Dict, Optional

EX_DIR = os.getenv("EXAMPLES_DIR", "data/platform_examples")

def _platform_dir(platform: str) -> str:
    d = os.path.join(EX_DIR, platform.lower())
    os.makedirs(d, exist_ok=True)
    return d

def _index_path(platform: str) -> str:
    return os.path.join(_platform_dir(platform), "index.yaml")

def load_index(platform: str) -> Optional[Dict]:
    path = _index_path(platform)
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
        except Exception:
            return None
    return None

def list_entries(platform: str) -> List[Dict]:
    d = _platform_dir(platform)
    idx = load_index(platform) or {}
    indexed = []
    files_meta = { (f.get("file") or "").strip(): f for f in (idx.get("files") or []) if isinstance(f, dict) and f.get("file") }
    for fname, meta in files_meta.items():
        path = os.path.join(d, fname)
        if not os.path.isfile(path) or not fname.lower().endswith(".txt"):
            continue
        try:
            with open(path, "r", encoding="utf-8") as fp:
                text = fp.read().strip()
            indexed.append({
                "file": fname,
                "text": text,
                "tags": list(meta.get("tags") or []),
                "weight": float(meta.get("weight") or 1.0),
            })
        except Exception:
            continue
    present = set(e["file"] for e in indexed)
    for name in sorted(os.listdir(d)):
        if not name.lower().endswith(".txt"):
            continue
        if name in present:
            continue
        path = os.path.join(d, name)
        try:
            with open(path, "r", encoding="utf-8") as fp:
                text = fp.read().strip()
            indexed.append({
                "file": name,
                "text": text,
                "tags": [],
                "weight": 1.0,
            })
        except Exception:
            continue
    return indexed

def list_texts(platform: str) -> List[str]:
    return [e["text"] for e in list_entries(platform)]

def import_zip(platform: str, zip_bytes: bytes) -> Dict:
    d = _platform_dir(platform)
    tmp = os.path.join(d, "_upload.zip")
    with open(tmp, "wb") as f:
        f.write(zip_bytes)
    with zipfile.ZipFile(tmp, "r") as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            if not info.filename.lower().endswith(".txt"):
                continue
            base = os.path.basename(info.filename)
            out_path = os.path.join(d, base)
            if os.path.exists(out_path):
                stem, ext = os.path.splitext(base)
                k = 1
                while os.path.exists(out_path):
                    out_path = os.path.join(d, f"{stem}_{k}{ext}")
                    k += 1
            with zf.open(info) as src, open(out_path, "wb") as dst:
                dst.write(src.read())
    os.remove(tmp)
    count = len([n for n in os.listdir(d) if n.lower().endswith(".txt")])
    return {"platform": platform, "count": count}