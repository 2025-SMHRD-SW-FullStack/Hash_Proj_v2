// src/components/seller/product/DetailComposer.jsx

import React, { useEffect, useRef, useState } from 'react'
import Button from '../../common/Button'

/**
 * 텍스트+이미지 간단 에디터 (툴바 = 이미지 추가만)
 * 외부로는 HTML 없이 blocks(JSON)만 전달
 *
 * props
 * - initialBlocks: [{ type:'text'|'image', text?, src?, name?, file? }]
 * - onChange: (blocks) => void
 * - editorClass: 추가로 줄 클래스 (예: 고정 높이)
 */
export default function DetailComposer({ initialBlocks = [], onChange, editorClass = 'h-60' }) {
  const editorRef = useRef(null)
  const fileRef = useRef(null)
  
  // 이미지 파일 매핑: blob URL -> File 객체
  const [imageFiles, setImageFiles] = useState(new Map())

  // 초기: blocks -> DOM
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.innerHTML = ''
    for (const b of initialBlocks) {
      if (b.type === 'image') {
        const img = document.createElement('img')
        img.src = b.src
        img.alt = b.name || ''
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.style.display = 'block'
        img.style.margin = '8px 0'
        el.appendChild(img)
      } else if (b.type === 'text' && b.text) {
        const p = document.createElement('p')
        p.textContent = b.text
        el.appendChild(p)
      }
    }
    placeCaretAtEnd(el)
    emit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickImage = () => fileRef.current?.click()

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue
      const url = URL.createObjectURL(f)
      
      // 이미지 파일 매핑에 추가
      setImageFiles(prev => new Map(prev).set(url, f))
      
      // 이미지를 에디터 끝에 추가
      appendImageToEnd(url, f.name)
    }
    e.target.value = ''
    emit()
  }

  const handlePaste = (e) => {
    // 서식 제거 붙여넣기
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (text && text.trim()) {
      insertText(text)
      emit()
    }
  }

  const handleInput = () => emit()

  // ---- helpers ----
  function placeCaretAtEnd(el) {
      const scrollRoot = document.querySelector('[data-scroll-root]')
      const prevWinX = window.scrollX
      const prevWinY = window.scrollY
      const prevRootTop = scrollRoot ? scrollRoot.scrollTop : null
  
      // 포커스로 인한 페이지 스크롤 이동 방지
      try { el.focus?.({ preventScroll: true }) } catch { el.focus?.() }
  
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
  
      // 커서는 보이게 하되, 에디터 내부 스크롤만 이동
      el.scrollTop = el.scrollHeight
  
      // 바깥 스크롤 위치 복원
      if (scrollRoot && typeof prevRootTop === 'number') {
        scrollRoot.scrollTop = prevRootTop
      } else {
        window.scrollTo({ left: prevWinX, top: prevWinY, behavior: 'auto' })
      }
    }
  
  function insertText(text) {
    if (!text || !text.trim()) return
    
    const el = editorRef.current
    if (!el) return
    
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) {
      // 선택된 범위가 없으면 에디터 끝에 추가
      const p = document.createElement('p')
      p.textContent = text
      el.appendChild(p)
      placeCaretAtEnd(el)
      return
    }
    
    const range = sel.getRangeAt(0)
    const node = document.createTextNode(text)
    range.deleteContents()
    range.insertNode(node)
    range.setStartAfter(node)
    range.setEndAfter(node)
    sel.removeAllRanges()
    sel.addRange(range)
  }
  
  function insertImage(src, name = '') {
    const el = editorRef.current
    if (!el) return
    
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) {
      // 선택된 범위가 없으면 에디터 끝에 추가
      appendImageToEnd(src, name)
      return
    }
    
    const range = sel.getRangeAt(0)
    const img = document.createElement('img')
    img.src = src
    img.alt = name
    img.style.maxWidth = '100%'
    img.style.height = 'auto'
    img.style.display = 'block'
    img.style.margin = '8px 0'
    range.deleteContents()
    range.insertNode(img)
    const br = document.createElement('br')
    img.after(br)
    const r = document.createRange()
    r.setStartAfter(br)
    r.setEndAfter(br)
    sel.removeAllRanges()
    sel.addRange(r)
  }
  
  // 에디터 끝에 이미지 추가 (새로운 함수)
  function appendImageToEnd(src, name = '') {
    const el = editorRef.current
    if (!el) return
    
    const img = document.createElement('img')
    img.src = src
    img.alt = name
    img.style.maxWidth = '100%'
    img.style.height = 'auto'
    img.style.display = 'block'
    img.style.margin = '8px 0'
    
    el.appendChild(img)
    
    // 커서를 이미지 뒤로 이동
    placeCaretAtEnd(el)
  }

  // DOM -> blocks (File 객체 정보 포함)
  function emit() {
    const blocks = domToBlocks(editorRef.current)
    onChange?.(blocks)
  }
  
  function domToBlocks(root) {
    const out = []
    if (!root) return out
    
    // 블록 단위: 이미지=개별, 텍스트=줄 모아서
    for (const node of Array.from(root.childNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') {
        const src = node.getAttribute('src') || ''
        const name = node.getAttribute('alt') || ''
        const file = imageFiles.get(src) // blob URL에 해당하는 File 객체
        
        out.push({ 
          type: 'image', 
          src, 
          name,
          file // File 객체 정보 추가
        })
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
        const txt = node.textContent || ''
        // 텍스트가 null이거나 빈 문자열이어도 추가 (공백 줄도 유지)
        out.push({ type: 'text', text: txt })
      } else if (node.nodeType === Node.TEXT_NODE) {
        const txt = node.textContent || ''
        if (txt.trim()) {
          out.push({ type: 'text', text: txt })
        }
      }
    }
    return out
  }

  const isEmpty = () => {
    const list = domToBlocks(editorRef.current)
    return list.length === 0
  }

  return (
    <div className="w-full">
      {/* 툴바: 입력 칼럼 우측 정렬 */}
      <div className="mb-2 flex justify-start">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />
        <Button type="button" size="sm" variant="signUp" className='text-sub' onClick={pickImage}>
          이미지 추가
        </Button>
      </div>

      <div className="relative">
        {/* ✅ 테두리는 항상 보이게, 스크롤은 내부에만 */}
        <div
          ref={editorRef}
          className={`w-full rounded-lg border border-gray-900 bg-white px-3 py-2 text-sm
                     overflow-y-auto ${editorClass}`}
          contentEditable
          suppressContentEditableWarning
          onPaste={handlePaste}
          onInput={handleInput}
        />
        {isEmpty() && (
          <div className="pointer-events-none absolute left-4 top-3 select-none text-sm text-gray-400">
            여기에 텍스트를 입력하고, [이미지 추가]로 이미지를 삽입하세요.
          </div>
        )}
      </div>
    </div>
  )
}
