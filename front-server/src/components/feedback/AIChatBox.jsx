// src/components/feedback/AIChatBox.jsx
import React, { useEffect, useRef, useState } from 'react';
// 별칭(@) 말고 상대경로 사용
import { startSession, sendReply, editSummary, acceptNow } from '../../service/ai';

function mapAssistantMessages(apiMsgs) {
  return (apiMsgs || []).map((m, i) => {
    if (m.type === 'image') {
      return { id: `ai-${Date.now()}-${i}`, sender: 'you', text: '', images: [m.content] };
    }
    return { id: `ai-${Date.now()}-${i}`, sender: 'you', text: m.content || '' };
  });
}

export default function AIChatBox({ userId, orderItemId, productId, onAccepted }) {
  const [step, setStep] = useState('INIT');
  const [messages, setMessages] = useState([]);   // {id, sender:'me'|'you', text, images?}
  const [input, setInput] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, summary]);

  useEffect(() => {
    if (!userId || !orderItemId) return;
    (async () => {
      setLoading(true);
      try {
        const s = await startSession(userId, orderItemId, productId);
        setStep(s.step);
        setMessages([{ id: 'first', sender: 'you', text: s.first_question }]);
      } catch (e) {
        setMessages((p) => [...p, { id: 'err', sender: 'you', text: `❌ ${e.message}` }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, orderItemId, productId]);

  const onSend = async () => {
    const t = input.trim();
    if (!t) return;
    setInput('');
    setMessages((p) => [...p, { id: `me-${Date.now()}`, sender: 'me', text: t }]);
    try {
      const r = await sendReply(userId, t);
      setStep(r.step);
      const newMsgs = mapAssistantMessages(r.messages);
      setMessages((p) => [...p, ...newMsgs]);
      if (r.summary_ready) {
        const lastTxt = [...newMsgs].reverse().find((m) => m.text)?.text || '';
        const pure = lastTxt.split('\n\n이 요약으로 게시할까요')[0] || lastTxt;
        setSummary(pure);
      }
    } catch (e) {
      setMessages((p) => [...p, { id: `err-${Date.now()}`, sender: 'you', text: `❌ ${e.message}` }]);
    }
  };

  const onEdit = async () => {
    const t = input.trim();
    if (!t) return;
    setInput('');
    setMessages((p) => [...p, { id: `me-${Date.now()}`, sender: 'me', text: t }]);
    try {
      const r = await editSummary(userId, t);
      setStep(r.step);
      const newMsgs = mapAssistantMessages(r.messages);
      setMessages((p) => [...p, ...newMsgs]);
      const lastTxt = [...newMsgs].reverse().find((m) => m.text)?.text || '';
      const pure = lastTxt.split('\n\n이제 게시할까요')[0] || lastTxt;
      setSummary(pure);
    } catch (e) {
      setMessages((p) => [...p, { id: `err-${Date.now()}`, sender: 'you', text: `❌ ${e.message}` }]);
    }
  };

  const onAccept = async () => {
    try {
      const r = await acceptNow(userId);
      setMessages((p) => [...p, { id: `ok-${Date.now()}`, sender: 'you', text: `✅ ${r.message || '게시 완료'}` }]);
      setStep('DONE');
      onAccepted?.();
    } catch (e) {
      setMessages((p) => [...p, { id: `err-${Date.now()}`, sender: 'you', text: `❌ ${e.message}` }]);
    }
  };

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
        <div className="border-t bg-white p-4">
          <div className="font-semibold mb-2">요약 본문</div>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={8}
            className="w-full p-2 border rounded resize-none"
          />
          <div className="mt-3">
            <button onClick={onAccept} className="px-4 py-2 rounded-lg bg-green-600 text-white">이대로 게시</button>
          </div>
        </div>
      )}

      <div className="border-t bg-white p-3 flex gap-2">
        <input
          className="flex-1 border rounded-lg px-3 py-2"
          placeholder={step === 'EDIT_OR_ACCEPT' ? '수정 요청 사항을 입력하세요' : '메시지를 입력하세요'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (step === 'EDIT_OR_ACCEPT' ? onEdit() : onSend()); }}
        />
        <button
          onClick={step === 'EDIT_OR_ACCEPT' ? onEdit : onSend}
          className="px-4 py-2 rounded-lg bg-black text-white"
        >
          {step === 'EDIT_OR_ACCEPT' ? '수정' : '전송'}
        </button>
      </div>
    </div>
  );
}
