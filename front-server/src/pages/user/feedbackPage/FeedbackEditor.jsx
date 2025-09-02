import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { submitFeedback } from "../../../service/feedbackService";
import { getMyPointBalance } from "../../../service/pointService"; // 포인트 조회 서비스 import
import Button from "../../../components/common/Button";
import ChatRoom from "../../../components/chat/ChatRoom";
import Icon from "../../../components/common/Icon";
import CloseIcon from "../../../assets/icons/ic_close.svg";
import useFeedbackStore from "../../../stores/feedbackStore";
import FeedbackSuccessModal from "../../../components/feedback/FeedbackSuccessModal"; // 새로 만든 모달 import
import useAuthStore from "../../../stores/authStore"; // ✅ authStore import 추가

const MAX_LENGTH = 1000; // 글자 수 제한 상수

const FeedbackEditor = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderItemId = searchParams.get("orderItemId");
  const productId = searchParams.get("productId");
  const type = searchParams.get("type") || "MANUAL";
  const overallScore = searchParams.get("overallScore");
  const scoresJson = searchParams.get("scoresJson");
  const addFeedback = useFeedbackStore((state) => state.addFeedback);

  // ✅ authStore에서 setPoints 함수 가져오기
  const setPoints = useAuthStore((state) => state.setPoints);

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

  // --- 모달 및 포인트 정보 저장을 위한 state 추가 ---
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState({ awarded: 0, total: 0 });


  useEffect(() => {
    if (type === 'AI') {
      setMessages([{ id: 1, text: '안녕하세요! 피드백 작성을 도와드릴 AI 챗봇입니다.', sender: 'you' }]);
      setStatus('IN_PROGRESS');
    }
  }, [type, orderItemId]);

  // --- 이미지 프리뷰 로직 ---
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files).slice(0, 5 - selectedFiles.length);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (indexToRemove) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));
    URL.revokeObjectURL(imagePreviews[indexToRemove]);
    setImagePreviews(prev => prev.filter((_, i) => i !== indexToRemove));
  };


  // --- AI 챗봇 핸들러 ---
  const handleAiFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    const newImagePreviews = files.map(file => URL.createObjectURL(file));
    const userMessage = { id: Date.now(), text: input, sender: 'me', images: newImagePreviews };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    event.target.value = null;
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "첨부된 이미지를 확인했어요! 이미지에 대해 설명해주시겠어요?", sender: 'you' }]);
    }, 1000);
  };

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

  // --- 최종 제출 핸들러 ---
  const handleSubmit = async () => {
    const finalContent = type === 'AI' ? draft : manualContent;
    if (!finalContent.trim()) {
      alert("피드백 내용을 입력해주세요.");
      return;
    }
    if (!orderItemId || !productId || !overallScore || !scoresJson) {
      alert("필수 정보가 누락되었습니다. (orderItemId, productId, score 등)");
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
        imagesJson: JSON.stringify(imagePreviews)
      };

      const feedbackResponse = await submitFeedback(payload);
      
      if(productId) {
        addFeedback(productId, {
          ...feedbackResponse,
          author: '작성자닉네임', // 실제로는 zustand 등에서 로그인된 사용자 정보로 대체해야 합니다.
          createdAt: new Date().toISOString(),
        });
      }

      // 포인트 지급 및 잔액 조회
      const awardedPoint = feedbackResponse.awardedPoint || 500; // API 응답에 지급 포인트가 없다면 기본값 사용
      const newTotalBalance = await getMyPointBalance();

      // ✅ authStore에 포인트 업데이트
      setPoints(newTotalBalance);
      
      setFeedbackResult({
        awarded: awardedPoint,
        total: newTotalBalance,
      });

      // alert 대신 모달을 띄웁니다.
      setSuccessModalOpen(true);

    } catch (e) {
      console.error("피드백 제출 실패:", e);
      const errorMessage = e?.response?.data?.message || e.message || '알 수 없는 오류가 발생했습니다.';
      alert(`피드백 제출 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- 렌더링 ---
  return (
    <>
      {type === "AI" ? (
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">AI 피드백 작성</h1>
          <p className="text-gray-600 mb-8">AI와 대화하며 피드백을 완성하고 제출해주세요.</p>
          
          <input
            type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleAiFileSelect} className="hidden"
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
                    <textarea 
                      value={draft} 
                      onChange={(e) => setDraft(e.target.value)} 
                      rows="8" 
                      className="w-full p-2 border rounded resize-none"
                      maxLength={MAX_LENGTH}
                    />
                    <div className="text-right text-sm text-gray-500 mt-1">
                      <span>{draft.length}</span> / {MAX_LENGTH}
                    </div>
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
      ) : (
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">수기 피드백 작성</h1>
          <p className="text-gray-600 mb-8">상품에 대한 솔직한 피드백을 남겨주세요. 포인트가 지급됩니다.</p>
          
          <div className="relative">
            <textarea
              className="w-full h-60 border rounded-xl p-4 text-base resize-none"
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder={"- 어떤 점이 좋았나요?\n- 어떤 점이 아쉬웠나요?"}
              maxLength={MAX_LENGTH}
            />
            <div className="absolute bottom-4 right-4 text-sm text-gray-500">
              <span>{manualContent.length}</span> / {MAX_LENGTH}
            </div>
          </div>
          
          <div className="mt-6">
            <h2 className="font-semibold mb-2">사진 첨부 (선택, 최대 5장)</h2>
            <div className="flex items-center gap-4">
              <Button variant="blackWhite" onClick={() => manualFileInputRef.current?.click()} disabled={selectedFiles.length >= 5}>
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
                      <Icon src={CloseIcon} alt="삭제" className="w-4 h-4" />
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
      )}

      {/* 성공 모달 렌더링 */}
      <FeedbackSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setSuccessModalOpen(false);
          navigate(`/product/${productId}`); // 모달이 닫히면 상품 페이지로 이동
        }}
        earnedPoints={feedbackResult.awarded}
        totalPoints={feedbackResult.total}
        onGoToProduct={() => navigate(`/product/${productId}`)}
        onGoToMyPage={() => navigate('/user/mypage/orders')} // 피드백 목록 대신 주문내역으로 이동
      />
    </>
  );
};

export default FeedbackEditor;