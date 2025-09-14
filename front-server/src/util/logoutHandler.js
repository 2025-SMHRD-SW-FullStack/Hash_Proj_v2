export function logoutHandler() {
    // 삭제할 항목: accessToken, userId, favorites_userId
    const userId = localStorage.getItem('userId');

    localStorage.removeItem('accessToken');
    localStorage.removeItem('userId');

    // 해당 유저 즐겨찾기 목록 삭제
    if (userId) {
        localStorage.removeItem(`favorites_${userId}`);
    }

}