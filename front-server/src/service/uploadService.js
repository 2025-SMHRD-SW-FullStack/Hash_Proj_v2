// /src/service/uploadService.js
import api from '../config/axiosInstance'

/**
 * 여러 이미지 업로드 후 서버가 반환한 파일 메타정보 배열을 그대로 돌려줌.
 * @param {'PROFILE'|'EXCHANGE'|'PRODUCT_THUMB'|'PRODUCT_CONTENT'|'AD'|'FEEDBACK'} type
 * @param {File[]} files
 * @returns {Promise<Array<{url:string, originalName:string, size:number}>>}
 */
export async function uploadImages(type, files) {
  const fd = new FormData()
  fd.append('type', type)
  for (const f of files) fd.append('files', f)

  try {
    const res = await api.post('/api/uploads/images', fd, {
      transformRequest: [(d) => d], // stringify 금지
    })
    return res.data
  } catch (e) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.message ||
      e?.message ||
      '업로드 실패'
    throw new Error(msg)
  }
}

/** 프로필 한 장 업로드 → 업로드 URL만 반환. */
export async function uploadProfileImage(file) {
  const [first] = await uploadImages('PROFILE', [file])
  if (!first?.url) throw new Error('업로드 응답에 url이 없습니다.')
  return first.url
}
