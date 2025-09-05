// /src/components/feedback/AIChatBox.jsx
import React, { useEffect, useRef, useState } from 'react'
import { startSession, sendReply, editSummary, acceptNow } from '../../service/aiService'
import { uploadImages } from '../../service/uploadService'

function mapAssistantMessages(apiMsgs) {
  return (apiMsgs || []).map((m, i) => {
    if (m.type === 'image') {
      return { id: `ai-${Date.now()}-${i}`, sender: 'you', text: '', images: [m.content] }
    }
    return { id: `ai-${Date.now()}-${i}`, sender: 'you', text: m.content || '' }
  })
}

export default function AIChatBox({ userId, orderItemId, productId, onAccepted }) {
  const [step, setStep] = useState('INIT')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const scroller = useRef(null)

  // 이미지 첨부 상태
  const [files, setFiles] = useState([])
  const [previews, setPreviews] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages, summary])

  useEffect(() => {
    if (!userId || !orderItemId) return
    ;(async () => {
      setLoading(true)
      try {
        const s = await startSession(userId, orderItemId, productId)
        setStep(s.step)
        setMessages([{ id: 'first', sender: 'you', text: s.first_question }])
      } catch (e) {
        setMessages((p) => [...p, { id: 'err', sender: 'you', text: `❌ ${e.message}` }])
      } finally {
        setLoading(false)
      }
    })()
  }, [userId, orderItemId, productId])

  const onSend = async () => {
    const t = input.trim()
    if (!t) return
    setInput('')
    setMessages((p) => [...p, { id: `me-${Date.now()}`, sender: 'me', text: t }])
    try {
      const r = await sendReply(userId, t)
      setStep(r.step)
      const newMsgs = mapAssistantMessages(r.messages)
      setMessages((p) => [...p, ...newMsgs])
      if (r.summary_ready) {
        const lastTxt = [...newMsgs].reverse().find((m) => m.text)?.text || ''
        const pure = lastTxt.split('\n\n이 요약으로 게시할까요')[0] || lastTxt
        setSummary(pure)
      }
    } catch (e) {
      setMessages((p) => [...p, { id: `err-${Date.now()}`, sender: 'you', text: `❌ ${e.message}` }])
    }
  }

  const onEdit = async () => {
    const t = input.trim()
    if (!t) return
    setInput('')
    setMessages((p) => [...p, { id: `me-${Date.now()}`, sender: 'me', text: t }])
    try {
      const r = await editSummary(userId, t)
      setStep(r.step)
      const newMsgs = mapAssistantMessages(r.messages)
      setMessages((p) => [...p, ...newMsgs])
      const lastTxt = [...newMsgs].reverse().find((m) => m.text)?.text || ''
      const pure = lastTxt.split('\n\n이제 게시할까요')[0] || lastTxt
      setSummary(pure)
    } catch (e) {
      setMessages((p) => [...p, { id: `err-${Date.now()}`, sender: 'you', text: `❌ ${e.message}` }])
    }
  }

  // 파일 핸들러
  const onPickFiles = (ev) => {
    const picked = Array.from(ev.target.files || [])
    if (!picked.length) return
    const next = [...files, ...picked].slice(0, 5) // 최대 5장
    setFiles(next)
    const newPreviews = picked.map((f) => URL.createObjectURL(f))
    setPreviews((p) => [...p, ...newPreviews].slice(0, 5))
  }

  const removeFile = (idx) => {
    setFiles((p) => p.filter((_, i) => i !== idx))
    URL.revokeObjectURL(previews[idx])
    setPreviews((p) => p.filter((_, i) => i !== idx))
  }

  const onAccept = async () => {
    try {
      // 1) 이미지가 있으면 업로드 → 퍼블릭 URL 확보
      let imageUrls
      if (files.length > 0) {
        // ⚠️ 백엔드 업로드 타입 enum에 FEEDBACK이 없다면 'PRODUCT_CONTENT'로 바꿔서 호출
        const uploaded = await uploadImages('FEEDBACK', files)
        imageUrls = uploaded.map((x) => x.url).filter(Boolean)
      }
      // 2) 게시(이미지 URL 함께 전달)
      const r = await acceptNow(userId, imageUrls)
      setMessages((p) => [...p, { id: `ok-${Date.now()}`, sender: 'you', text: `✅ ${r.message || '게시 완료'}` }])
      setStep('DONE')
      onAccepted?.()
    } catch (e) {
      setMessages((p) => [...p, { id: `err-${Date.now()}`, sender: 'you', text: `❌ ${e.message}` }])
    }
  }

  return (
    <div className="flex flex-col border rounded-2xl overflow-hidden h-full">
      <div className="px-4 py-3 border-b font-semibold">AI 피드백 챗봇</div>

      <div ref={scroller} className="flex-1 overflow-auto bg-gray-50 p-3">
        {messages.map((m) => (
          <div key={m.id} className={`mb-3 flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
            {m.images?.length ? (
              <img src={m.images[0]} alt="" className="max-w-[220px] rounded-lg shadow" />
            ) : (
              <div className={`${m.sender === 'me' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'} rounded-2xl px-4 py-2 shadow max-w-[80%] whitespace-pre-wrap`}>
                {m.text}
              </div>
            )}
          </div>
        ))}
        {loading && <div className="text-sm text-gray-500">세션 생성 중…</div>}
      </div>

      {step === 'EDIT_OR_ACCEPT' && (
        <div className="border-t bg-white p-4 space-y-3">
          <div>
            <div className="font-semibold mb-2">요약 본문</div>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={8}
              className="w-full p-2 border rounded resize-none"
            />
          </div>

          {/* 이미지 첨부 UI */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">사진 첨부 (선택, 최대 5장)</div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border"
                disabled={files.length >= 5}
              >
                사진 선택
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={onPickFiles}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative w-24 h-24">
                  <img src={src} alt={`preview-${i}`} className="w-full h-full object-cover rounded-lg border" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border shadow text-xs"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-1">
            <button onClick={onAccept} className="px-4 py-2 rounded-lg bg-green-600 text-white">
              이대로 게시
            </button>
          </div>
        </div>
      )}

      <div className="border-t bg-white p-3 flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder={step === 'EDIT_OR_ACCEPT' ? '수정 요청 사항을 입력하세요' : '메시지를 입력하세요'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (step === 'EDIT_OR_ACCEPT' ? onEdit() : onSend()) }}
        />
        <button
          onClick={step === 'EDIT_OR_ACCEPT' ? onEdit : onSend}
          className="px-4 py-2 rounded-lg bg-black text-white"
        >
          {step === 'EDIT_OR_ACCEPT' ? '수정' : '전송'}
        </button>
      </div>
    </div>
  )
}
