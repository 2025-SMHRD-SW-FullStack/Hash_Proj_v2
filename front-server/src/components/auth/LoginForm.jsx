// src/components/auth/LoginForm.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import SocialLoginButtons from './SocialLoginButtons';
import TextField from '../common/TextField';
import { useLoginForm } from '../../hooks/useLoginForm';
import { loginRequest } from '../../service/authService';
import useAuthStore from '../../stores/authStore';
import Button from '../common/Button';
import Logo from '../../assets/images/Meonjeo_Logo.png';

const LoginForm = () => {
  const navigate = useNavigate();
  const { email, setEmail, password, setPassword, isValid } = useLoginForm();
  const { login } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      const loginData = await loginRequest({ email, password });
      login(loginData);
      alert('로그인에 성공했습니다.');
      navigate('/');
    } catch (error) {
      alert('아이디 또는 비밀번호가 일치하지 않습니다.');
      console.error('로그인 실패: ', error);
    }
  };

   return (
    <div className="flex flex-col items-center justify-center bg-white px-4">
      {/* 이 div가 전체 폼의 최대 너비를 'sm' (small)으로 제한하고 있습니다.
        이 값을 'max-w-xs' (extra small) 등으로 바꾸면 더 좁아집니다.
      */}
      <div className="mx-auto w-full max-w-sm"> 
        <div className="text-center mb-8">
          <h2 className="mt-[120px] text-2xl font-bold tracking-tight text-gray-900">
            로그인
          </h2>
        </div>

        {/* 이 form 태그가 TextField들의 직접적인 부모이며,
          너비를 100%로 채우고 있습니다. 
        */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <TextField
            id="email"
            label="아이디(이메일)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            id="password"
            label="비밀번호"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="pt-2">
            <Button type="submit" size="lg" disabled={!isValid} className="w-full h-12 text-base">
              로그인하기
            </Button>
          </div>
        </form>

        {/* 아이디/비밀번호 찾기 */}
        <div className="mt-4 text-center text-sm">
          <button onClick={() => navigate('/find-auth')} className="font-medium text-gray-600 hover:text-primary bg-transparent border-none">
            아이디/비밀번호 찾기
          </button>
        </div>

        {/* SNS 계정으로 로그인 */}
        <div className='flex items-center my-4 justify-between
        '>
          <span>SNS으로 로그인</span>
          <SocialLoginButtons />
        </div>

        {/* 회원가입 버튼 */}
        <div className="mt-4 text-center">
            <span className="text-sm text-gray-600">아직 회원이 아니신가요?</span>
            <Button variant="outline" size="lg" onClick={() => navigate('/email_signup')} className="w-full mt-2 h-12 text-base">
                회원가입
            </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;