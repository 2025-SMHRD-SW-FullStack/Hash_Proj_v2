// // src/pages/authPage/FindAuthPage.jsx
// import React, { useState, useEffect, useRef } from "react";
// import { useSearchParams, useNavigate } from "react-router-dom";
// import { phoneSend, phoneVerify, resetPassword } from "../../service/authService";
// import Button from "../../components/common/Button";

// // ✅ 공통: OTP 입력 UI
// const OtpInput = ({ length = 6, value, setValue }) => {
//   const inputs = useRef([]);

//   const handleChange = (e, idx) => {
//     const val = e.target.value.replace(/[^0-9]/g, "");
//     if (!val) return;
//     const newValue = value.split("");
//     newValue[idx] = val[val.length - 1]; // 마지막 숫자만 반영
//     setValue(newValue.join(""));

//     if (idx < length - 1 && inputs.current[idx + 1]) {
//       inputs.current[idx + 1].focus();
//     }
//   };

//   const handleKeyDown = (e, idx) => {
//     if (e.key === "Backspace" && !value[idx] && idx > 0) {
//       inputs.current[idx - 1].focus();
//     }
//   };

//   return (
//     <div className="flex gap-2 justify-center">
//       {Array(length)
//         .fill(0)
//         .map((_, i) => (
//           <input
//             key={i}
//             ref={(el) => (inputs.current[i] = el)}
//             maxLength={1}
//             value={value[i] || ""}
//             onChange={(e) => handleChange(e, i)}
//             onKeyDown={(e) => handleKeyDown(e, i)}
//             className="w-10 h-12 text-center border rounded-lg"
//           />
//         ))}
//     </div>
//   );
// };

// // ✅ 아이디 찾기 폼
// const FindIdForm = () => {
//   const [step, setStep] = useState(1);
//   const [phone, setPhone] = useState("");
//   const [otp, setOtp] = useState("");
//   const [timeLeft, setTimeLeft] = useState(0);
//   const [foundEmail, setFoundEmail] = useState(null);
//   const [error, setError] = useState("");

//   // 타이머
//   useEffect(() => {
//     if (timeLeft <= 0) return;
//     const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
//     return () => clearInterval(timer);
//   }, [timeLeft]);

//   const handleSendCode = async () => {
//     if (phone.length < 10) return setError("휴대폰 번호를 정확히 입력해주세요.");
//     try {
//       await phoneSend(phone);
//       setStep(2);
//       setTimeLeft(180); // 3분 카운트다운
//       setError("");
//     } catch {
//       setError("인증번호 발송에 실패했습니다.");
//     }
//   };

//   const handleVerify = async () => {
//     try {
//       const result = await phoneVerify({ phone, otp });
//       if (result.success) {
//         // 실제 서비스에서는 마스킹 처리 권장 (예: te***@gmail.com)
//         setFoundEmail(result.email || "test@example.com");
//         setStep(3);
//       } else {
//         setError("인증번호가 올바르지 않습니다.");
//       }
//     } catch {
//       setError("인증번호 확인 중 오류가 발생했습니다.");
//     }
//   };

//   const maskEmail = (email) => {
//     const [id, domain] = email.split("@");
//     return id.slice(0, 3) + "***@" + domain;
//   };

//   return (
//     <div className="space-y-6">
//       {/* Step 표시 */}
//       <div className="flex items-center justify-center gap-2 text-sm">
//         <span className={step >= 1 ? "text-gray-800 font-semibold" : "text-gray-400"}>① 본인확인</span>
//         <span>›</span>
//         <span className={step >= 2 ? "text-gray-800 font-semibold" : "text-gray-400"}>② 인증번호 입력</span>
//         <span>›</span>
//         <span className={step >= 3 ? "text-gray-800 font-semibold" : "text-gray-400"}>③ 결과 확인</span>
//       </div>

//       {step === 1 && (
//         <>
//           <input
//             type="tel"
//             value={phone}
//             onChange={(e) => setPhone(e.target.value)}
//             placeholder="전화번호 ('-' 제외)"
//             className="w-full h-12 border rounded-lg px-4"
//           />
//           {error && <p className="text-red-500 text-sm">{error}</p>}
//           <Button onClick={handleSendCode} className="w-full bg-gray-800 text-white">
//             인증번호 받기
//           </Button>
//         </>
//       )}

//       {step === 2 && (
//         <>
//           <OtpInput value={otp} setValue={setOtp} />
//           <p className="text-sm text-gray-500 text-center">
//             남은 시간 {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
//           </p>
//           {error && <p className="text-red-500 text-sm text-center">{error}</p>}
//           <Button onClick={handleVerify} className="w-full bg-gray-800 text-white">
//             인증 확인
//           </Button>
//         </>
//       )}

//       {step === 3 && foundEmail && (
//         <div className="p-6 rounded-lg bg-gray-100 text-center">
//           <h3 className="text-lg font-semibold mb-2">아이디 찾기 결과</h3>
//           <p className="text-gray-700">회원님의 아이디는</p>
//           <p className="text-lg font-bold text-gray-900 mt-2">{maskEmail(foundEmail)}</p>
//           <p className="mt-2">입니다.</p>
//           <Button onClick={() => window.location.reload()} className="w-full mt-4">
//             다시 찾기
//           </Button>
//         </div>
//       )}
//     </div>
//   );
// };

// // ✅ 비밀번호 찾기 폼
// const FindPasswordForm = () => {
//   const navigate = useNavigate();
//   const [step, setStep] = useState(1);
//   const [email, setEmail] = useState("");
//   const [phone, setPhone] = useState("");
//   const [otp, setOtp] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [error, setError] = useState("");
//   const [timeLeft, setTimeLeft] = useState(0);

//   useEffect(() => {
//     if (timeLeft <= 0) return;
//     const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
//     return () => clearInterval(timer);
//   }, [timeLeft]);

//   const handleSendCode = async () => {
//     try {
//       await phoneSend(phone);
//       setStep(2);
//       setTimeLeft(180);
//       setError("");
//     } catch {
//       setError("인증번호 발송에 실패했습니다.");
//     }
//   };

//   const handleVerify = async () => {
//     try {
//       const result = await phoneVerify({ phone, otp });
//       if (result.success) {
//         setStep(3);
//         setError("");
//       } else {
//         setError("인증번호가 올바르지 않습니다.");
//       }
//     } catch {
//       setError("인증번호 확인 중 오류가 발생했습니다.");
//     }
//   };

//   const handleResetPassword = async () => {
//     if (newPassword !== confirmPassword) {
//       return setError("새 비밀번호가 일치하지 않습니다.");
//     }
//     try {
//       await resetPassword({ email, newPassword });
//       alert("비밀번호가 성공적으로 변경되었습니다.");
//       navigate("/login");
//     } catch {
//       setError("비밀번호 재설정에 실패했습니다.");
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* Step 표시 */}
//       <div className="flex items-center justify-center gap-2 text-sm">
//         <span className={step >= 1 ? "text-gray-800 font-semibold" : "text-gray-400"}>① 본인확인</span>
//         <span>›</span>
//         <span className={step >= 2 ? "text-gray-800 font-semibold" : "text-gray-400"}>② 인증번호 입력</span>
//         <span>›</span>
//         <span className={step >= 3 ? "text-gray-800 font-semibold" : "text-gray-400"}>③ 새 비밀번호 설정</span>
//       </div>

//       {step === 1 && (
//         <>
//           <input
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             placeholder="아이디(이메일)"
//             className="w-full h-12 border rounded-lg px-4"
//           />
//           <input
//             type="tel"
//             value={phone}
//             onChange={(e) => setPhone(e.target.value)}
//             placeholder="전화번호 ('-' 제외)"
//             className="w-full h-12 border rounded-lg px-4"
//           />
//           {error && <p className="text-red-500 text-sm">{error}</p>}
//           <Button onClick={handleSendCode} className="w-full bg-gray-800 text-white">
//             인증번호 받기
//           </Button>
//         </>
//       )}

//       {step === 2 && (
//         <>
//           <OtpInput value={otp} setValue={setOtp} />
//           <p className="text-sm text-gray-500 text-center">
//             남은 시간 {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
//           </p>
//           {error && <p className="text-red-500 text-sm text-center">{error}</p>}
//           <Button onClick={handleVerify} className="w-full bg-gray-800 text-white">
//             인증 확인
//           </Button>
//         </>
//       )}

//       {step === 3 && (
//         <>
//           <input
//             type="password"
//             value={newPassword}
//             onChange={(e) => setNewPassword(e.target.value)}
//             placeholder="새 비밀번호"
//             className="w-full h-12 border rounded-lg px-4"
//           />
//           <input
//             type="password"
//             value={confirmPassword}
//             onChange={(e) => setConfirmPassword(e.target.value)}
//             placeholder="새 비밀번호 확인"
//             className="w-full h-12 border rounded-lg px-4"
//           />
//           {error && <p className="text-red-500 text-sm">{error}</p>}
//           <Button onClick={handleResetPassword} className="w-full bg-gray-800 text-white">
//             비밀번호 재설정
//           </Button>
//         </>
//       )}
//     </div>
//   );
// };

// // ✅ 최상위 페이지
// const FindAuthPage = () => {
//   const [searchParams] = useSearchParams();
//   const initialTab = searchParams.get("tab") || "findId";
//   const [activeTab, setActiveTab] = useState(initialTab);

//   return (
//     <div className="max-w-md mx-auto my-10 p-8 border rounded-lg shadow-lg">
//       <div className="flex border-b mb-6">
//         <button
//           onClick={() => setActiveTab("findId")}
//           className={`flex-1 py-3 text-center font-semibold ${
//             activeTab === "findId" ? "border-b-2 border-gray-800 text-gray-800" : "text-gray-400"
//           }`}
//         >
//           아이디 찾기
//         </button>
//         <button
//           onClick={() => setActiveTab("findPw")}
//           className={`flex-1 py-3 text-center font-semibold ${
//             activeTab === "findPw" ? "border-b-2 border-gray-800 text-gray-800" : "text-gray-400"
//           }`}
//         >
//           비밀번호 찾기
//         </button>
//       </div>

//       {activeTab === "findId" ? <FindIdForm /> : <FindPasswordForm />}
//     </div>
//   );
// };

// export default FindAuthPage;
