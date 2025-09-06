import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const MainLayout = () => {
  return (
    // 1. 전체 레이아웃의 높이를 현재 화면 높이에 정확히 맞춥니다.
    <div className="flex flex-col h-screen">
      
      {/* 2. Header는 레이아웃의 일부로, 고정된 높이를 차지합니다. */}
      <Header />
      
      {/* 3. main 영역이 남은 공간을 모두 채우고(flex-1), 내용이 넘칠 경우 이 부분만 스크롤(overflow-y-auto)되도록 설정합니다. */}
      <main className="flex-1 overflow-y-auto bg-white">

        {/* 4. main 내부의 컨테이너가 항상 main 영역을 꽉 채우도록 설정하여 푸터를 하단에 고정시킵니다. */}
        <div className="flex flex-col min-h-full">
          
          {/* 5. 실제 페이지 콘텐츠(Outlet)가 최소 1080px 높이를 가지며, 남는 공간을 채우도록 설정합니다. */}
          <div className="flex-1 min-h-[1080px]">
            <Outlet />
          </div>
          
          {/* 6. Footer는 스크롤되는 콘텐츠의 가장 마지막에 위치합니다. */}
          <Footer />
        </div>
        
      </main>
    </div>
  )
}

export default MainLayout