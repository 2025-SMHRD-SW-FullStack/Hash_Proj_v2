import React, { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { submitFeedback, getMyFeedbacks, getFeedbackDetail, updateFeedback } from "../../../service/feedbackService";
import { uploadImages } from "../../../service/uploadService";
import { getMyPointBalance } from "../../../service/pointService";
import Button from "../../../components/common/Button";
import Icon from "../../../components/common/Icon";
import CloseIcon from "../../../assets/icons/ic_close.svg";
import useFeedbackStore from "../../../stores/feedbackStore";
import FeedbackSuccessModal from "../../../components/feedback/FeedbackSuccessModal";
import useAuthStore from "../../../stores/authStore";
import feedbackGuidelines from "../../../data/feedbackGuidelines.json";
import { getMyProductDetail } from "../../../service/productService";

import AIChatBox from "../../../components/feedback/AIChatBox";

const MAX_LENGTH = 1000;

const CATEGORY_ALIASES = {
  electronics: "전자제품",
  appliance: "전자제품",
  beauty: "화장품",
  cosmetics: "화장품",
  service: "무형자산",
  software: "무형자산",
  subscription: "무형자산",
  platform: "무형자산",
  meal: "밀키트",
  mealkit: "밀키트",
  foodkit: "밀키트",
};

function normalizeCategory(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (["전자제품", "화장품", "무형자산", "밀키트"].includes(s)) return s;
  const low = s.toLowerCase();
  for (const k of Object.keys(CATEGORY_ALIASES)) {
    if (low.includes(k)) return CATEGORY_ALIASES[k];
  }
  return null;
}

const FeedbackEditor = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderItemId = searchParams.get("orderItemId");
  const productId = searchParams.get("productId");
  const type = searchParams.get("type") || "MANUAL";
  const overallScore = searchParams.get("overallScore");
  const scoresJson = searchParams.get("scoresJson");
  const feedbackIdQ = searchParams.get("feedbackId");
  const isEdit = Boolean(feedbackIdQ);

  const addFeedback = useFeedbackStore((state) => state.addFeedback);
  const setPoints = useAuthStore((state) => state.setPoints);
  const userId = useAuthStore((state) => state.user?.id) || 0;

  const [resolvedFeedbackId, setResolvedFeedbackId] = useState(null);

  const [product, setProduct] = useState(null);
  const normalized = normalizeCategory(product?.category);
  const guidelines = (normalized && feedbackGuidelines.categories[normalized]) || [];

  const [manualContent, setManualContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const manualFileInputRef = useRef(null);

  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  const [feedbackResult, setFeedbackResult] = useState({ awarded: 0, total: 0 });

  // ★ URL의 프리설문 파싱 → AI 경로로 전달
  const preSurvey = useMemo(() => {
    let answers = undefined;
    try {
      if (scoresJson) {
        const parsed = JSON.parse(decodeURIComponent(scoresJson));
        if (parsed && typeof parsed === 'object') answers = parsed;
      }
    } catch { /* noop */ }
    const overall = overallScore != null ? Number(overallScore) : undefined;
    if (overall == null && !answers) return undefined;
    return { overallScore: overall, answers };
  }, [overallScore, scoresJson]);

  useEffect(() => {
    if (!productId) return;
    getMyProductDetail(productId)
      .then((data) => {
        if (data?.product) setProduct(data.product);
      })
      .catch(() => {});
  }, [productId]);

  useEffect(() => {
    (async () => {
      if (!isEdit) return;
      let fid = feedbackIdQ;

      if (fid === "auto") {
        try {
          const page = await getMyFeedbacks();
          const list = page?.content ?? page?.items ?? [];
          const mine = list.find((f) => String(f?.orderItemId) === String(orderItemId));
          fid = mine?.id;
        } catch (e) {
          console.error(e);
        }
      }

      if (!fid) {
        alert("수정할 피드백을 찾지 못했습니다.");
        return;
      }
      setResolvedFeedbackId(Number(fid));

      try {
        const detail = await getFeedbackDetail(Number(fid));
        setManualContent(detail?.content ?? "");
        try {
          const imgs = JSON.parse(detail?.imagesJson || "[]");
          const arr = Array.isArray(imgs) ? imgs : [];
          setImagePreviews(arr);
        } catch { /* noop */ }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isEdit, feedbackIdQ, orderItemId]);

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

  const handleSubmit = async () => {
    const finalContent = manualContent;
    if (!finalContent.trim()) {
      alert("피드백 내용을 입력해주세요.");
      return;
    }
    if (!isEdit && (!orderItemId || !productId || !overallScore || !scoresJson)) {
      alert("필수 정보가 누락되었습니다. (orderItemId, productId, score 등)");
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedImageUrls = [];
      if (selectedFiles.length > 0) {
        const uploadResults = await uploadImages("FEEDBACK", selectedFiles);
        uploadedImageUrls = uploadResults.map((res) => res.url);
      }

      if (isEdit) {
        const imgs = uploadedImageUrls.length ? uploadedImageUrls : imagePreviews;
        await updateFeedback(Number(resolvedFeedbackId), { content: finalContent, images: imgs });
        const newTotalBalance = await getMyPointBalance();
        setPoints(newTotalBalance);
        setFeedbackResult({ awarded: 0, total: newTotalBalance });
        setSuccessModalOpen(true);
        return;
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

      const awardedPoint = Number(feedbackResponse?.awardedPoint ?? 0);
      const newTotalBalance = await getMyPointBalance();
      setPoints(newTotalBalance);

      setFeedbackResult({
        awarded: awardedPoint,
        total: newTotalBalance,
      });

      setSuccessModalOpen(true);
    } catch (e) {
      console.error("피드백 제출/수정 실패:", e);
      const status = e?.response?.status;
      const code = e?.response?.data?.code || e?.response?.data?.error || "";
      if (!isEdit && status === 409 && /ALREADY_WRITTEN_FOR_PRODUCT/i.test(code)) {
        alert("이미 작성한 피드백이 있어 수정 화면으로 이동합니다.");
        navigate("/user/mypage/orders");
        return;
      }
      const errorMessage = e?.response?.data?.message || e.message || "알 수 없는 오류가 발생했습니다.";
      alert(`처리 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ★ AI 게시 완료 콜백: 서버 응답의 awardedPoint 반영
  const handleAIAccepted = async (result) => {
    try {
      const newTotal = await getMyPointBalance();
      setPoints(newTotal);
      const awarded =
        Number(
          result?.awardedPoint ??
          result?.message?.awardedPoint ??
          0
        ) || 0;
      setFeedbackResult({ awarded, total: newTotal });
    } catch {
      const fallback =
        Number(result?.awardedPoint ?? result?.message?.awardedPoint ?? 0) || 0;
      setFeedbackResult((s) => ({ awarded: fallback || s.awarded || 0, total: s.total || 0 }));
    } finally {
      setSuccessModalOpen(true);
    }
  };

  return (
    <>
      {type === "AI" ? (
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">AI 피드백 작성</h1>
          <p className="text-gray-600 mb-8">AI와 대화하며 피드백을 완성하고 제출해주세요.</p>

          {!userId || !orderItemId ? (
            <div className="text-red-600">유효하지 않은 접근입니다. (로그인/주문항목 확인)</div>
          ) : (
            <div className="h-[75vh] min-h-[600px] border rounded-2xl shadow-lg overflow-hidden">
              <AIChatBox
                userId={userId}
                orderItemId={Number(orderItemId)}
                productId={productId ? Number(productId) : undefined}
                preSurvey={preSurvey}              /* ★ 전달 */
                onAccepted={handleAIAccepted}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">{isEdit ? "수기 피드백 수정" : "수기 피드백 작성"}</h1>
          <p className="text-gray-600 mb-8">
            상품에 대한 솔직한 피드백을 남겨주세요. {isEdit ? "수정 후 저장됩니다." : "포인트가 지급됩니다."}
          </p>

          {guidelines.length > 0 && (
            <div className="mb-6">
              <h1 className="text-xl font-bold mb-2">작성 가이드</h1>
              <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm bg-gray-50 p-4 rounded-lg">
                {guidelines.map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
            </div>
          )}

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
            <h1 className="text-xl font-semibold mb-2">사진 첨부 (선택, 최대 5장)</h1>
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
            <Button size="lg" onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-3 text-lg font-bold">
              {isSubmitting ? (isEdit ? "수정 중..." : "제출 중...") : isEdit ? "수정 완료" : "제출하고 포인트 받기"}
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
