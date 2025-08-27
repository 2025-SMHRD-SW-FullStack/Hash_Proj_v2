import React, { useEffect, useRef, useState, useMemo } from 'react'
import TextField from '../common/TextField'
import Logo from '../../assets/images/ReSsol_Logo1.png'
import lockIcon from '../../assets/images/lockIcon.png'
import checkIcon from '../../assets/images/checkIcon.png'
import errorIcon from '../../assets/images/error.png'
import successIcon from '../../assets/images/success.png'
import {
  loginRequest,
  signupRequest,
  phoneSend,
  phoneVerify,
} from '../../service/authService'
import { useSignUpForm } from '../../hooks/useSignupForm'
import { useNavigate } from 'react-router-dom'
import Button from '../common/Button'
import useAuthStore from '../../stores/authStore'

const EmailSignUpForm = () => {
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    nickname, // name -> nickname
    setNickname, // setName -> setNickname
    phoneNumber,
    setPhoneNumber,
    phoneVerifyToken,
    setPhoneVerifyToken,
    birthDate,
    setBirthDate,
    gender,
    setGender,
    isValid,
    emailError,
    setEmailError,
    passwordError,
    setPasswordError,
    passwordConfirmError,
    setPasswordConfirmError,
  } = useSignUpForm()

  const DOMAIN_OPTIONS = [
    { value: '', label: '직접 입력' },
    { value: 'naver.com', label: 'naver.com' },
    { value: 'gmail.com', label: 'gmail.com' },
    { value: 'daum.net', label: 'daum.net' },
    { value: 'nate.com', label: 'nate.com' },
    { value: 'kakao.com', label: 'kakao.com' },
  ]

  const [emailId, setEmailId] = useState('')
  const [emailDomain, setEmailDomain] = useState('')
  const [selectedDomain, setSelectedDomain] = useState('')
  const domainInputRef = useRef(null)

  const domainSelected = (e) => {
    const v = e.target.value
    setSelectedDomain(v)
    setEmailDomain(v)
    if (v === '') {
      requestAnimationFrame(() => domainInputRef.current?.focus())
    }
  }

  useEffect(() => {
    if (emailId && emailDomain) {
      const fullEmail = `${emailId}@${emailDomain}`
      setEmail(fullEmail)
      setEmailError('')
    } else {
      setEmail('')
    }
  }, [emailId, emailDomain, setEmail, setEmailError])

  const [phone1, setPhone1] = useState('010')
  const [phone2, setPhone2] = useState('')
  const [phone3, setPhone3] = useState('')
  const onlyDigits = (v) => v.replace(/\D/g, '')

  const onPhone2 = (e) => setPhone2(onlyDigits(e.target.value).slice(0, 4))
  const onPhone3 = (e) => setPhone3(onlyDigits(e.target.value).slice(0, 4))

  useEffect(() => {
    const joined = `${phone1}${phone2}${phone3}`
    setPhoneNumber(joined)
  }, [phone1, phone2, phone3, setPhoneNumber])

  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [otp, setOtp] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [infoMsg, setInfoMsg] = useState('')
  const [leftSec, setLeftSec] = useState(0)
  const timerRef = useRef(null)

  const canSend = useMemo(() => leftSec === 0 && !isSending, [leftSec, isSending])

  useEffect(() => {
    if (leftSec === 0) return
    timerRef.current && clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setLeftSec((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [leftSec])

  const mmss = useMemo(() => {
    const m = Math.floor(leftSec / 60).toString().padStart(2, '0')
    const s = (leftSec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }, [leftSec])

  const onSendCode = async () => {
    const digits = `${phone1}${phone2}${phone3}`
    if (digits.length < 10) {
      setPhoneError('휴대폰 번호를 정확히 입력해 주세요.')
      return
    }
    try {
      setIsSending(true)
      setOtp('')
      setOtpError('')
      setInfoMsg('')
      // requestId가 이제 없으므로 관련 상태 제거
      await phoneSend(digits) 
      setLeftSec(180)
      setInfoMsg('인증번호를 발송했습니다. 3분 안에 입력해 주세요.')
    } catch (e) {
      console.error(e)
      setPhoneError('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsSending(false)
    }
  }

  const onVerifyCode = async () => {
    if (!otp || otp.length < 4) {
      setOtpError('인증번호 4~6자리를 입력해 주세요.')
      return
    }
    if (leftSec === 0) {
      setOtpError('인증 시간이 만료되었습니다. 다시 발송해 주세요.')
      return
    }
    try {
      setIsVerifying(true)
      const res = await phoneVerify({
        phoneNumber: `${phone1}${phone2}${phone3}`,
        code: otp,
      })
      if (res?.phoneVerifyToken) {
        setPhoneVerifyToken(res.phoneVerifyToken)
        setPhoneVerified(true)
        setInfoMsg('휴대폰 인증이 완료되었습니다.')
        setOtpError('')
        setLeftSec(0)
      } else {
        setOtpError('인증번호가 올바르지 않습니다.')
      }
    } catch (e) {
      console.error(e)
      setOtpError('인증 처리 중 오류가 발생했습니다.')
    } finally {
      setIsVerifying(false)
    }
  }

  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('')
      return
    }
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,16}$/
    if (!regex.test(value)) {
      setPasswordError('8~16자의 영문 대/소문자, 숫자, 특수문자를 사용해 주세요.')
    } else {
      setPasswordError('')
    }
  }

  const validatePasswordConfirm = (value) => {
    if (!value) {
      setPasswordConfirmError('')
      return
    }
    if (value !== password) {
      setPasswordConfirmError('비밀번호가 같지 않습니다. 다시 입력해주세요.')
    } else {
      setPasswordConfirmError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phoneVerified) {
      setPhoneError('휴대폰 인증을 완료해주세요.')
      return
    }
    try {
      const signupData = {
        email,
        password,
        confirmPassword,
        nickname, // name -> nickname
        phoneNumber,
        phoneVerifyToken,
        birthDate,
        gender,
        profileImageUrl: 'http://example.com/profile.jpg', // 임시값
      }
      
      const response = await signupRequest(signupData)
      const loginData = await loginRequest({ email, password })
      login(loginData)
      navigate('/')
      alert('회원가입이 완료되었습니다!')
      console.log('회원가입 결과: ', response)
    } catch (error) {
      console.error('회원가입 실패: ', error)
      const errorMsg = error?.message || '회원가입에 실패했습니다. 다시 시도해주세요.'
      alert(errorMsg);
    }
  }

  const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  const daysInMonth = (y, m) =>
    [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]

  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    const start = 1950
    return Array.from({ length: currentYear - start + 1 }, (_, i) => start + i)
  }, [currentYear])
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])
  const days = useMemo(() => {
    if (!birthYear || !birthMonth) return []
    const d = daysInMonth(Number(birthYear), Number(birthMonth))
    return Array.from({ length: d }, (_, i) => i + 1)
  }, [birthYear, birthMonth])

  useEffect(() => {
    if (!birthYear || !birthMonth || !birthDay) return
    const max = daysInMonth(Number(birthYear), Number(birthMonth))
    if (Number(birthDay) > max) setBirthDay('')
  }, [birthYear, birthMonth, birthDay])

  useEffect(() => {
    if (!birthYear || !birthMonth || !birthDay) return
    const mm = String(birthMonth).padStart(2, '0')
    const dd = String(birthDay).padStart(2, '0')
    setBirthDate(`${birthYear}-${mm}-${dd}`)
  }, [birthYear, birthMonth, birthDay, setBirthDate])

  return (
    <div className="flex flex-col items-center px-4 pb-28 pt-8">
      <form className="mx-auto w-full max-w-[960px]" onSubmit={handleSubmit}>
        <div>
          <div className='flex'>
            <h1 className="text-2xl font-bold text-[#75C9E8]">먼저 써봄&ensp;</h1>
            <h1 className="text-2xl font-bold">회원가입</h1>
          </div>
          <div>
            <strong className='text-xl'>필수 기본 정보 입력</strong>
            <hr />
          </div>
        </div>
        <div className="mb-3 flex items-center gap-3"></div>
        <div className="mt-2">
          <label htmlFor="emailId" className="form-label">아이디(이메일)</label>
          <div className="mt-1 flex flex-wrap items-center gap-2 md:flex-nowrap">
            <div className="w-[220px] shrink-0 sm:w-[260px] md:w-[280px]">
              <TextField id="emailId" label="이메일" required isRequiredMark singleFirst value={emailId} onChange={(e) => setEmailId(e.target.value.trim())}/>
            </div>
            <span className="shrink-0 select-none px-1 text-gray-600">@</span>
            <div className="min-w-0 flex-1">
              {selectedDomain === '' ? (
                <TextField id="email_domain" label="직접입력" singleMiddle2 value={emailDomain} onChange={(e) => setEmailDomain(e.target.value.trim())} inputRef={domainInputRef}/>
              ) : (
                <TextField id="email_domain_ro" label="도메인" singleMiddle2 value={selectedDomain} readOnly />
              )}
            </div>
            <select className="select-basic w-36 shrink-0 rounded-l-none sm:w-40 md:w-44" value={selectedDomain} onChange={domainSelected} aria-label="도메인 선택">
              {DOMAIN_OPTIONS.map(({ value, label }) => (
                <option key={label} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {emailError && <span className="form-error"><img src={errorIcon} alt="에러 아이콘" className="mr-1.5 h-5" />{emailError}</span>}
        </div>
        <div className="mt-2 space-y-3">
          <TextField id="password" label="비밀번호" type="password" required isRequiredMark singleFirst value={password} onChange={(e) => { setPassword(e.target.value); validatePassword(e.target.value); }} icon={<img src={lockIcon} alt="비밀번호 아이콘" />} />
          <TextField id="password_confirm" label="비밀번호 확인" type="password" required isRequiredMark singleLast value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); validatePasswordConfirm(e.target.value); }} icon={<img src={checkIcon} alt="비밀번호 아이콘" />} />
          {passwordError && <span className="mt-1 inline-flex items-center text-sm text-red-600"><img src={errorIcon} alt="에러 아이콘" className="mr-1.5 h-5" />{passwordError}</span>}
          {passwordConfirmError && <span className="mt-1 inline-flex items-center text-sm text-red-600"><img src={errorIcon} alt="에러 아이콘" className="mr-1.5 h-5 w-5"/>{passwordConfirmError}</span>}
          <TextField id="user_name" label="닉네임" type="text" required isRequiredMark single value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </div>
        <div className="mt-2 grid grid-cols-1 items-center gap-2 md:[grid-template-columns:110px_12px_1fr_12px_1fr_auto]">
          <select className="h-11 rounded-xl border border-gray-200 px-2" value={phone1} onChange={(e) => setPhone1(e.target.value)}>
            {['010', '011', '016', '017', '018', '019'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="hidden text-center text-gray-500 md:block">-</span>
          <input className="h-11 rounded-xl border border-gray-200 px-3" inputMode="numeric" maxLength={4} placeholder="1234" value={phone2} onChange={onPhone2} />
          <span className="hidden text-center text-gray-500 md:block">-</span>
          <input className="h-11 rounded-xl border border-gray-200 px-3" inputMode="numeric" maxLength={4} placeholder="5678" value={phone3} onChange={onPhone3} />
          <Button type="button" onClick={onSendCode} disabled={!canSend || phoneVerified || !phone2 || !phone3} aria-disabled={!canSend || phoneVerified || !phone2 || !phone3} className="h-[100%]">
            {phoneVerified ? '인증완료' : leftSec > 0 ? `재전송(${mmss})` : isSending ? '발송중...' : '인증번호 발송'}
          </Button>
        </div>
        {phoneError && <span className="mt-1 inline-flex items-center text-sm text-red-600"><img src={errorIcon} alt="에러" className="mr-1.5 h-5" />{phoneError}</span>}
        {!phoneVerified && leftSec > 0 && (
          <div className="mt-2 flex flex-col gap-2 md:flex-row">
            <TextField id="otp" label="인증번호" type="text" single value={otp} onChange={(e) => { const v = onlyDigits(e.target.value).slice(0, 6); setOtp(v); setOtpError(''); }} />
            <button type="button" className="h-11 rounded-xl border border-gray-200 bg-indigo-50 px-4 disabled:opacity-60" onClick={onVerifyCode} disabled={isVerifying}>
              {isVerifying ? '확인중...' : '인증확인'}
            </button>
          </div>
        )}
        {otpError && <span className="mt-1 inline-flex items-center text-sm text-red-600"><img src={errorIcon} alt="에러" className="mr-1.5 h-5" />{otpError}</span>}
        {phoneVerified && <span className="mt-1 inline-flex items-center text-sm text-green-600"><img src={successIcon} alt="성공" className="mr-1.5 h-5" />휴대폰 인증이 완료되었습니다.</span>}
        {infoMsg && !phoneVerified && <span className="mt-1 text-sm text-gray-500">{infoMsg}</span>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TextField id="gender" label="성별" type="radio" single value={gender} onChange={(e) => setGender(e.target.value)} />
          <TextField id="birthYear" label="출생 연도" type="select" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} options={years} placeholderOption="선택" />
          <TextField id="birthMonth" label="월" type="select" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} options={months.map((m) => String(m).padStart(2, '0'))} placeholderOption="선택" />
          <TextField id="birthDay" label="일" type="select" value={birthDay} onChange={(e) => setBirthDay(e.target.value)} options={days.map((d) => String(d).padStart(2, '0'))} placeholderOption={!birthYear || !birthMonth ? '먼저 선택' : '선택'} disabled={!birthYear || !birthMonth} />
        </div>
        <div className="mb-2 mt-6 rounded-xl border border-dashed border-gray-200 p-4 text-gray-600">
          약관/수신 동의
        </div>
        <Button variant="signUp" size="lg" className="w-full" type="submit" disabled={!isValid || !phoneVerified}>
          회원가입
        </Button>
      </form>
    </div>
  )
}

export default EmailSignUpForm