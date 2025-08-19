import { BrowserRouter, Route, Routes } from "react-router-dom";
import '/src/assets/styles/global.css'
import EmailSignUp from '/src/pages/auth/EmailSignUpPage';
import Main from '/src/pages/Main';
import Login from '/src/pages/auth/LoginPage';
import SignUp from '/src/pages/auth/SignUpPage';
import OAuthSuccess from '/src/pages/auth/OAuthSuccess';
import MyPage from "../pages/mypage/MyPage";
import ComInfo from "../components/mypage/ComInfo";
import UserInfo from "../components/mypage/UserInfo";
import PhoneVerifiedHandler from "../pages/auth/PhoneVerifiedHandler";


const Router = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* 메인 */}
                <Route path='/' element={<Main/>}/>

                {/* 로그인 / 회원가입 관련 */}
                <Route path='/login' element={<Login/>}/>
                <Route path='/signup' element={<SignUp/>}/>
                <Route path='/email_signup' element={<EmailSignUp/>}/>

                {/* 휴대폰 인증 관련 */}
                <Route path='/phone-verified' element={<PhoneVerifiedHandler/>}/>
                <Route path='/oauth-success' element={<OAuthSuccess/>}/>

                {/* 마이페이지 관련 */}
                <Route path="/mypage" element={<MyPage />}>
                    <Route index element={<UserInfo />} /> 
                    <Route path="user_info" element={<UserInfo />} />
                    <Route path="com_info" element={<ComInfo />} />
                </Route>
            </Routes>    
        </BrowserRouter>
    )

}

export default Router;