import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { submitFeedback } from "../../service/feedbackService";
import Button from "../../components/common/Button";
import ChatRoom from "../../components/chatPage/ChatRoom";
import Icon from "../../components/common/Icon";
import deleteIcon from "../../assets/icons/ic_delete.svg";
import useFeedbackStore from "../../stores/feedbackStore";

const FeedbackEditor = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderItemId = searchParams.get("orderItemId");
  const type = searchParams.get("type") || "MANUAL";
  const overallScore = searchParams.get("overallScore");
  const scoresJson = searchParams.get("scoresJson");
  const addFeedback = useFeedbackStore((state) => state.addFeedback);

  // --- 수기 작성 관련 상태 ---
  const [manualContent, setManualContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const manualFileInputRef = useRef(null);

  // --- AI 챗봇 관련 상태 ---
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('IN_PROGRESS');
  const fileInputRef = useRef(null); // AI 채팅 파일 입력을 위한 ref

  useEffect(() => {
    if (type === 'AI') {
      setMessages([{ id: 1, text: '안녕하세요! 피드백 작성을 도와드릴 AI 챗봇입니다.', sender: 'you' }]);
      setStatus('IN_PROGRESS');
    }
  }, [type, orderItemId]);

  // --- 이미지 프리뷰 로직 수정 ---
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files).slice(0, 5 - selectedFiles.length);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (indexToRemove) => {
    // 선택된 파일 목록에서 제거
    setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));

    // 프리뷰 URL 해제 및 목록에서 제거
    URL.revokeObjectURL(imagePreviews[indexToRemove]);
    setImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };


  // --- AI 챗봇 핸들러 ---

  // 파일 선택 시 메시지 추가 및 전송
  const handleAiFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const newImagePreviews = files.map(file => URL.createObjectURL(file));

    const userMessage = {
      id: Date.now(),
      text: input,
      sender: 'me',
      images: newImagePreviews
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    event.target.value = null;

    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "첨부된 이미지를 확인했어요! 이미지에 대해 설명해주시겠어요?", sender: 'you' }]);
    }, 1000);
  };

  // 텍스트 메시지 전송
  const handleSendMessage = () => {
    if (!input.trim()) return;
    const userMessage = { id: Date.now(), text: input, sender: 'me' };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    setTimeout(() => {
      if (currentInput.toLowerCase().includes("아쉬웠던 점")) {
        setStatus('DRAFT_READY');
        setDraft("생성된 초안 예시입니다. 자유롭게 수정 후 제출해주세요.");
        setMessages(prev => [...prev, { id: Date.now() + 1, text: '말씀을 바탕으로 초안을 생성했어요.', sender: 'you' }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, text: '그렇군요! 더 자세히 들려주시겠어요?', sender: 'you' }]);
      }
    }, 1000);
  };

  const handleRefine = () => {
    if (!input.trim()) return;
    const prompt = input;
    setMessages(prev => [...prev, { id: Date.now(), text: prompt, sender: 'me' }]);
    setInput('');
    setTimeout(() => {
      setDraft(prev => `${prev}\n\n[수정 요청 사항]\n- ${prompt}`);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "네, 요청에 따라 초안을 다음과 같이 수정했습니다.", sender: 'you' }]);
    }, 1000);
  };

  const handleSubmit = async () => {
    const finalContent = type === 'AI' ? draft : manualContent;
    if (!finalContent.trim()) {
      alert("피드백 내용을 입력해주세요.");
      return;
    }
    if (!orderItemId || !overallScore || !scoresJson) {
      alert("필수 정보가 누락되었습니다.");
      return;
    }
    setIsSubmitting(true);
    
    try {
      const payload = {
        orderItemId: Number(orderItemId),
        type,
        overallScore: Number(overallScore),
        scoresJson,
        content: finalContent,
        imagesJson: JSON.stringify(imagePreviews) // 프리뷰 URL을 JSON 문자열로 저장
      };

      const feedbackResponse = await submitFeedback(payload);

      // productId를 가져오기 위해 상품 정보 조회
      const urlParams = new URLSearchParams(window.location.search);
      const productId = urlParams.get('productId');
      
      if(productId) {
          addFeedback(productId, {
            ...feedbackResponse,
            author: '작성자닉네임', // 실제로는 user 정보에서 가져와야 합니다.
            createdAt: new Date().toISOString(),
          });
      }


      alert("피드백이 성공적으로 제출되었습니다.");
      navigate(`/product/${productId}`); // 제출 후 상품 상세 페이지로 이동

    } catch (e) {
      console.error("피드백 제출 실패:", e);
      alert(`피드백 제출 중 오류가 발생했습니다: ${e.message || ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- 렌더링 ---
  if (type === "AI") {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">AI 피드백 작성</h1>
        <p className="text-gray-600 mb-8">AI와 대화하며 피드백을 완성하고 제출해주세요.</p>
        
        <input
          type="file"
          multiple
          accept="image/*"
          ref={fileInputRef}
          onChange={handleAiFileSelect}
          className="hidden"
        />

        <div className="h-[75vh] min-h-[600px] border rounded-2xl shadow-lg overflow-hidden">
          <ChatRoom
            chatId={orderItemId}
            onClose={() => navigate(-1)}
            isControlled={true}
            messages={messages}
            input={input}
            onInputChange={setInput}
            onSendMessage={status === 'DRAFT_READY' ? handleRefine : handleSendMessage}
            onAttachClick={() => fileInputRef.current?.click()}
            uiConfig={{
              headerTitle: "AI 피드백 챗봇",
              showProductInfo: false,
              inputPlaceholder: status === 'DRAFT_READY' ? '초안 수정 요청사항...' : '메시지를 입력하세요...',
              buttonText: status === 'DRAFT_READY' ? '수정' : '전송',
            }}
            mainChildren={
              status === 'DRAFT_READY' && (
                <div className="p-4 border-y bg-gray-50 my-4">
                  <h3 className="font-semibold mb-2">피드백 초안</h3>
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows="8" className="w-full p-2 border rounded" />
                </div>
              )
            }
            footerChildren={
              status === 'DRAFT_READY' && (
                <Button onClick={handleSubmit} disabled={isSubmitting} className="!bg-green-600 w-28">
                  {isSubmitting ? "..." : '최종 제출'}
                </Button>
              )
            }
            isCompleted={status === 'COMPLETED'}
          />
        </div>
      </div>
    );
  }

  // --- 수기 작성 페이지 ---
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">수기 피드백 작성</h1>
      <p className="text-gray-600 mb-8">상품에 대한 솔직한 피드백을 남겨주세요. 포인트가 지급됩니다.</p>
      <textarea
        className="w-full h-60 border rounded-xl p-4 text-base"
        value={manualContent}
        onChange={(e) => setManualContent(e.target.value)}
        placeholder={"- 어떤 점이 좋았나요?\n- 어떤 점이 아쉬웠나요?"}
      />
      <div className="mt-6">
        <h2 className="font-semibold mb-2">사진 첨부 (선택, 최대 5장)</h2>
        <div className="flex items-center gap-4">
          <Button variant="whiteBlack" onClick={() => manualFileInputRef.current?.click()}>
            사진 첨부하기
          </Button>
          <input type="file" multiple accept="image/*" ref={manualFileInputRef} onChange={handleFileChange} className="hidden" />
          <div className="flex flex-wrap gap-3">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative w-24 h-24">
                <img src={preview} alt={`preview ${index}`} className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-0.5"
                >
                  <Icon src={deleteIcon} alt="삭제" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-8">
        <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} className="px-10 py-4 text-lg font-bold">
          {isSubmitting ? "제출 중..." : "제출하고 포인트 받기"}
        </Button>
      </div>
    </div>
  );
};

export default FeedbackEditor;