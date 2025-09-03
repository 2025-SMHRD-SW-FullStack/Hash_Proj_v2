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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="mx-auto w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
            <img
            className="mx-auto h-20 w-auto cursor-pointer"
            src={Logo}
            alt="먼저써봄 로고"
            onClick={() => navigate('/')}
            />
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-gray-900">
            로그인
            </h2>
        </div>

        {/* 로그인 폼 */}
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
          <button onClick={() => navigate('/find-auth')} className="font-medium text-gray-600 hover:text-blue-500 bg-transparent border-none">
            아이디/비밀번호 찾기
          </button>
        </div>

        {/* SNS 계정으로 로그인 */}
        <SocialLoginButtons title="SNS 계정으로 로그인" />

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