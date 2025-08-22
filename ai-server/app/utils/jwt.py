from typing import Optional

class JWTUser:
    def __init__(self, user_id: Optional[int]):
        self.user_id = user_id

def verify_jwt_token(authorization: Optional[str]) -> JWTUser:
    # Mock: "Bearer <userId:int>"
    if not authorization:
        return JWTUser(None)
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return JWTUser(int(parts[1]))
    except Exception:
        pass
    return JWTUser(None)