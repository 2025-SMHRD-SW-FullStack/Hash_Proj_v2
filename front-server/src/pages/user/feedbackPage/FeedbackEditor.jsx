import React, { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { submitFeedback } from "../../../service/feedbackService";
import { uploadImages } from "../../../service/uploadService";
import { getMyPointBalance } from "../../../service/pointService";
import Button from "../../../components/common/Button";
// ChatRoom 제거 (ai-server 직결 컴포넌트로 대체)
import Icon from "../../../components/common/Icon";
import CloseIcon from "../../../assets/icons/ic_close.svg";
import useFeedbackStore from "../../../stores/feedbackStore";
import FeedbackSuccessModal from "../../../components/feedback/FeedbackSuccessModal";
import useAuthStore from "../../../stores/authStore";
import feedbackGuidelines from "../../../data/feedbackGuidelines.json";
import { getMyProductDetail } from "../../../service/productService";

// ★ ai-server 연동 컴포넌트
import AIChatBox from "../../../components/feedback/AIChatBox";

const MAX_LENGTH = 1000;

const FeedbackEditor = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderItemId = searchParams.get("orderItemId");
  const productId = searchParams.get("productId");
  const type = searchParams.get("type") || "MANUAL";
  const overallScore = searchParams.get("overallScore");
  const scoresJson = searchParams.get("scoresJson");

  const addFeedback = useFeedbackStore((state) => state.addFeedback);
  const setPoints = useAuthStore((state) => state.setPoints);
  const userId = useAuthStore((state) => state.user?.id) || 0;

  // 상품/가이드
  const [product, setProduct] = useState(null);
  const category = product?.category || "기타";
  const guidelines = [
    ...feedbackGuidelines.common,
    ...(feedbackGuidelines.categories[category] || []),
  ];

  // 수기 작성 상태
  const [manualContent, setManualContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const manualFileInputRef = useRef(null);

  // 공통 모달
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState({ awarded: 0, total: 0 });

  // 상품 상세(카테고리) 로딩
  useEffect(() => {
    if (!productId) return;
    getMyProductDetail(productId).then((data) => {
      if (data?.product) setProduct(data.product);
    }).catch(() => {});
  }, [productId]);

  // 이미지 프리뷰
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files).slice(0, 5 - selectedFiles.length);
    if (files.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    URL.revokeObjectURL(imagePreviews[indexToRemove]);
    setImagePreviews((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // 수기 제출
  const handleSubmit = async () => {
    const finalContent = manualContent;
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
      // 이미지 업로드
      let uploadedImageUrls = [];
      if (selectedFiles.length > 0) {
        // 서버의 ImageType이 FEEDBACK이 아닌 경우 프로젝트 설정에 맞춰 변경
        const uploadResults = await uploadImages("FEEDBACK", selectedFiles);
        uploadedImageUrls = uploadResults.map((res) => res.url);
      }

      const payload = {
        orderItemId: Number(orderItemId),
        type: "MANUAL",
        overallScore: Number(overallScore),
        scoresJson,
        content: finalContent,
        imagesJson: JSON.stringify(uploadedImageUrls),
      };

      const feedbackResponse = await submitFeedback(payload);

      if (productId) {
        addFeedback(productId, {
          ...feedbackResponse,
          author: "작성자닉네임",
          createdAt: new Date().toISOString(),
        });
      }

      const awardedPoint = feedbackResponse.awardedPoint || 500;
      const newTotalBalance = await getMyPointBalance();
      setPoints(newTotalBalance);

      setFeedbackResult({
        awarded: awardedPoint,
        total: newTotalBalance,
      });

      setSuccessModalOpen(true);
    } catch (e) {
      console.error("피드백 제출 실패:", e);
      const errorMessage = e?.response?.data?.message || e.message || "알 수 없는 오류가 발생했습니다.";
      alert(`피드백 제출 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI 게시 성공 콜백(ai-server -> Spring 저장 완료 후)
  const handleAIAccepted = async () => {
    try {
      const newTotal = await getMyPointBalance();
      setPoints(newTotal);
      setFeedbackResult({ awarded: 500, total: newTotal }); // 서버가 포인트를 명시 안 주면 기본값
    } catch {
      setFeedbackResult((s) => ({ ...s, awarded: s.awarded || 500 }));
    } finally {
      setSuccessModalOpen(true);
    }
  };

  // 렌더링
  return (
    <>
      {type === "AI" ? (
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">AI 피드백 작성</h1>
          <p className="text-gray-600 mb-8">AI와 대화하며 피드백을 완성하고 제출해주세요.</p>

          {!userId || !orderItemId ? (
            <div className="text-red-600">유효하지 않은 접근입니다. (로그인/주문항목 확인)</div>
          ) : (
            <div className="h-[75vh] min-h-[600px] border rounded-2xl shadow-lg overflow-hidden">
              {/* ChatRoom 대신 ai-server 직결 컴포넌트 */}
              <AIChatBox
                userId={userId}
                orderItemId={Number(orderItemId)}
                productId={productId ? Number(productId) : undefined}
                onAccepted={handleAIAccepted}
              />
            </div>
          )}
        </div>
      ) : (
        // 수기 피드백 작성
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">수기 피드백 작성</h1>
          <p className="text-gray-600 mb-8">상품에 대한 솔직한 피드백을 남겨주세요. 포인트가 지급됩니다.</p>

          {/* 작성 가이드 */}
          <div className="mb-6">
            <h2 className="font-semibold mb-2">작성 가이드</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm bg-gray-50 p-4 rounded-lg">
              {guidelines.map((q, idx) => (
                <li key={idx}>{q}</li>
              ))}
            </ul>
          </div>

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
              <Button
                variant="blackWhite"
                onClick={() => manualFileInputRef.current?.click()}
                disabled={selectedFiles.length >= 5}
              >
                사진 첨부하기
              </Button>
              <input
                type="file"
                multiple
                accept="image/*"
                ref={manualFileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
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
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-10 py-4 text-lg font-bold"
            >
              {isSubmitting ? "제출 중..." : "제출하고 포인트 받기"}
            </Button>
          </div>
        </div>
      )}

      <FeedbackSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setSuccessModalOpen(false);
          navigate(`/product/${productId}`);
        }}
        earnedPoints={feedbackResult.awarded}
        totalPoints={feedbackResult.total}
        onGoToProduct={() => navigate(`/product/${productId}`)}
        onGoToMyPage={() => navigate("/user/mypage/orders")}
      />
    </>
  );
};

export default FeedbackEditor;
