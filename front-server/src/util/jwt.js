// utils/jwt.js
import { jwtDecode }from "jwt-decode";

export function getUserIdFromToken() {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;

    try {
        const decoded = jwtDecode(token);
        return decoded.sub || decoded.userId || decoded.id || null; // 백엔드 구조에 따라 다를 수 있음
    } catch (e) {
        console.error("JWT 디코딩 실패", e);
        return null;
    }
}
