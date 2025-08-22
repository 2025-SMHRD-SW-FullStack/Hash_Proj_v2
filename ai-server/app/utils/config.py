import os
def getenv_or_file(name, default=None):
    val = os.getenv(name)
    path = os.getenv(f"{name}_FILE")
    if (not val) and path and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    return val or default

DATABASE_URL = getenv_or_file("DATABASE_URL")
