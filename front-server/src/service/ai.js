import useAuthStore from '../stores/authStore'
const AI_BASE = import.meta.env.VITE_AI_SERVER_URL ?? 'http://127.0.0.1:8000'

function getToken() {
  try {
    const t = useAuthStore.getState()?.accessToken
    if (t) return t
    return localStorage.getItem('access_token') || ''
  } catch { return '' }
}

async function _post(path, body) {
  const token = getToken()
  const res = await fetch(`${AI_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.detail || `${path} 실패(${res.status})`)
  }
  return res.json()
}

export async function startSession(userId, orderItemId, productId) {
  return _post('/api/ai/chat/session', {
    user_id: Number(userId),
    order_item_id: Number(orderItemId),
    product_id: productId != null ? Number(productId) : null,
  })
}

export async function sendReply(userId, text) {
  return _post('/api/ai/chat/reply', { user_id: Number(userId), text })
}

// 필요하면 수동 게시 버튼에서만 사용
export async function acceptNow(userId) {
  return _post('/api/ai/chat/accept', { user_id: Number(userId) })
}

export async function editSummary(userId, instructions) {
  return _post('/api/ai/chat/edit', { user_id: Number(userId), instructions })
}
