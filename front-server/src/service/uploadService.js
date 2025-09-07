// /src/service/uploadService.js
import api from '../config/axiosInstance';

/**
 * 여러 이미지 업로드.
 * 1) 표준 사용: uploadImages('FEEDBACK', files)
 * 2) 실수 방지: uploadImages(files) 도 허용(자동으로 type='FEEDBACK')
 *
 * 입력은 File | FileList | Array<File> 모두 허용.
 * 반환은 [{ url, originalName, size }] 형태로 정규화.
 *
 * @param {'PROFILE'|'EXCHANGE'|'PRODUCT_THUMB'|'PRODUCT_CONTENT'|'AD'|'FEEDBACK'|'CHAT'|File[]|FileList|File} typeOrFiles
 * @param {File[]|FileList|File} [filesMaybe]
 * @returns {Promise<Array<{url:string, originalName?:string, size?:number}>>}
 */
export async function uploadImages(typeOrFiles, filesMaybe) {
  // --- 시그니처 유연화: type 생략 시 FEEDBACK 기본값 사용 ---
  let type = 'FEEDBACK';
  let input = filesMaybe;

  if (typeof typeOrFiles === 'string') {
    type = typeOrFiles;
  } else {
    // 첫 번째 인자로 파일들을 준 경우
    input = typeOrFiles;
  }

  const files = normalizeFiles(input);
  if (!files.length) return [];

  const fd = new FormData();
  fd.append('type', type);
  for (const f of files) fd.append('files', f);

  try {
    const res = await api.post('/api/uploads/images', fd, {
      // axios가 FormData를 건드리지 않도록
      transformRequest: [(d) => d],
    });

    // 다양한 응답 포맷 호환: data.data | data | 단일객체 | 문자열 배열
    const raw = res?.data?.data ?? res?.data ?? [];

    // 배열 케이스
    if (Array.isArray(raw)) {
      if (!raw.length) return [];
      // 서버가 URL 문자열 배열을 주는 경우
      if (typeof raw[0] === 'string') {
        return raw.map((url) => ({ url, originalName: '', size: 0 }));
      }
      // [{url, ...}] 형태면 그대로 (url이 없을 수도 있으니 보정)
      return raw
        .map((it) => {
          if (typeof it === 'string') return { url: it, originalName: '', size: 0 };
          if (it && typeof it === 'object') {
            return {
              url: it.url ?? it.path ?? '',
              originalName: it.originalName ?? it.name ?? '',
              size: Number(it.size ?? 0),
            };
          }
          return null;
        })
        .filter((x) => x && x.url);
    }

    // 단일 객체 케이스
    if (raw && typeof raw === 'object' && typeof raw.url === 'string') {
      return [{ url: raw.url, originalName: raw.originalName ?? raw.name ?? '', size: Number(raw.size ?? 0) }];
    }

    // 알 수 없는 포맷
    return [];
  } catch (e) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.message ||
      e?.message ||
      '업로드 실패';
    throw new Error(msg);
  }
}

/**
 * 프로필 한 장 업로드 → 업로드된 URL만 반환
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function uploadProfileImage(file) {
  const [first] = await uploadImages('PROFILE', [file]);
  if (!first?.url) throw new Error('업로드 응답에 url이 없습니다.');
  return first.url;
}

/**
 * 업로드 결과 → URL 문자열 배열로 변환하는 헬퍼
 * @param {Array<{url:string}>} results
 * @returns {string[]}
 */
export function toUrls(results) {
  return Array.isArray(results) ? results.map((x) => x?.url).filter(Boolean) : [];
}

/** 입력을 Array<File> 로 정규화 */
function normalizeFiles(input) {
  if (!input) return [];
  // 단일 File
  if (typeof File !== 'undefined' && input instanceof File) return [input];

  // FileList 또는 array-like
  if (typeof input.length === 'number') {
    try {
      return Array.from(input).filter(Boolean);
    } catch {
      const arr = [];
      for (let i = 0; i < input.length; i++) arr.push(input[i]);
      return arr.filter(Boolean);
    }
  }

  // Array<File>
  if (Array.isArray(input)) return input.filter(Boolean);

  return [];
}
