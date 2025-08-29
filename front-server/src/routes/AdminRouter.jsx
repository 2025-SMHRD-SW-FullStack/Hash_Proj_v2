import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import AdminLayout from '/src/components/layouts/AdminLayout'
import AdminMain from '/src/pages/admin/AdminMain'
import FeedbackReportsPage from '/src/pages/admin/FeedbackReportsPage'

export default function AdminRouter() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminMain />} />
        <Route path="feedbacks/reports" element={<FeedbackReportsPage />} />
        {/* 필요 시 확장: <Route path="ads/review" element={<AdsReviewPage />} /> */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
