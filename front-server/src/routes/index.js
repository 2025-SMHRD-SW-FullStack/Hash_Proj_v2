import MyOrderList from "../components/myPage/MyOrderList";

const routes = [
    // 라우터 설정 예시
    {
        path: '/mypage',
  element: <MyPageLayout />,
  children: [
        // 1. 사용자가 /mypage 로 접속하면...
        //    /mypage/orders 로 경로를 즉시 바꿔주세요!
        { index: true, element: <Navigate to="/mypage/orders" replace /> },

        // 2. /mypage/orders 경로일 때 주문/배송 내역을 보여주세요.
        { path: 'orders', element: <MyOrderList /> }, // '/mypage/orders' 에는 주문 내역을
        { path: ''}
        { path: 'edit', element: <EditProfile /> },   // '/mypage/edit' 에는 정보 수정 페이지를
        { path: 'feedback', element: <MyFeedback /> }, // /mypage/feedback
        ]
    }

]
