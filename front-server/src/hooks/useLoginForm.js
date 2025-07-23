import { useMemo, useState } from "react";

/** [ 로그인 상태관리 ]
 * - 이메일, 비밀번호
*/

export function useLoginForm() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // 두 값 모두 공백이 아니어야 함
    // .trim() -> 사용자가 스페이스만 입력하는 걸 방지
    const isValid = useMemo(() => {
        return email.trim() !== '' && password.trim() !== '';
    }, [email,password]) 


    return {
        email,
        setEmail,
        password,
        setPassword,
        isValid,
    };
}