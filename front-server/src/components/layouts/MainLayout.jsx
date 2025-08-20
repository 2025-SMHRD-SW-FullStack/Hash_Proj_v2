import Header from './Header'

const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex-1 overflow-y-auto">
        <div className="py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}

export default MainLayout
