// src/components/common/qna/QnAImageGallery.jsx
import React from 'react'
import axiosInstance from '../../../config/axiosInstance'

// ===== 파일 호스트 계산 =====
// 1) 명시적으로 VITE_FILE_BASE_URL 있으면 그걸 사용
// 2) 없으면 axios baseURL의 origin만 추출(경로(/api 등) 제거)
// 3) 그것도 없으면 window.origin
function resolveFileBase() {
  const explicit = import.meta.env?.VITE_FILE_BASE_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  const raw = axiosInstance?.defaults?.baseURL || ''
  try {
    const origin = new URL(raw, window.location.origin).origin
    return origin.replace(/\/+$/, '')
  } catch {
    return (typeof window !== 'undefined' ? window.location.origin : '').replace(/\/+$/, '')
  }
}
const FILE_BASE = resolveFileBase()

function joinUrl(base, path) {
  if (!path) return base
  if (/^(data:|blob:|https?:\/\/)/i.test(path)) return path
  if (path.startsWith('/')) return `${base}${path}`
  return `${base}/${path}`
}

function parseToUrls(imagesJson) {
  if (!imagesJson) return []
  let arr = imagesJson
  try {
    if (typeof imagesJson === 'string') arr = JSON.parse(imagesJson)
  } catch {
    arr = [imagesJson] // 파싱 실패 시 단일 문자열로 취급
  }
  if (!Array.isArray(arr)) arr = [arr]
  return arr
    .map((it) => {
      if (!it) return null
      if (typeof it === 'string') return it
      return it.imageUrl || it.url || it.path || null
    })
    .filter(Boolean)
}

export default function QnAImageGallery({ imagesJson, title = '이미지' }) {
  const urls = parseToUrls(imagesJson)
  if (!urls.length) return null

  return (
    <div className="mt-3">
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => {
          const abs = joinUrl(FILE_BASE, u)
          return (
            <a key={i} href={abs} target="_blank" rel="noreferrer">
              <img
                src={abs}
                alt={`${title} ${i + 1}`}
                className="w-20 h-20 object-cover rounded-lg border"
                onError={(e) => {
                  e.currentTarget.src =
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZWVlIi8+PHRleHQgeD0iNDAiIHk9IjQ0IiBmb250LXNpemU9IjEwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5JTUc8L3RleHQ+PC9zdmc+'
                }}
              />
            </a>
          )
        })}
      </div>
    </div>
  )
}
