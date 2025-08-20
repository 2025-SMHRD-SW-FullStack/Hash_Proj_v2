import React from 'react'

const SubLayout = () => {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-w-7xl flex w-full px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  )
}

export default SubLayout
