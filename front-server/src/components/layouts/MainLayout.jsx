import Header from './Header'

const MainLayout = ({ children }) => {
  return (
    // 👇 min-h-screen으로 변경하여 최소 화면 높이를 보장하되, 내용이 길어지면 늘어나도록 합니다.
    <div className="flex h-screen flex-col">
      <Header />

      {/* 👇 내부 스크롤을 제거하고, flex-1만 남겨 헤더 외의 모든 공간을 차지하도록 합니다. */}
      <main className="flex-1 overflow-y-auto">
        {/* 👇 자식 div에서 높이 관련 클래스를 제거하여 MainPage의 콘텐츠가 높이를 결정하도록 합니다. */}
        <div className="py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}

export default MainLayout
