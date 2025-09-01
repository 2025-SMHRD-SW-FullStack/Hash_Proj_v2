import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import AdminLayout from '/src/components/layouts/AdminLayout'

import SellerApprovalsPage from '/src/pages/admin/SellerApprovalsPage'
import FeedbackReportsPage from '/src/pages/admin/FeedbackReportsPage'
import AdsPage from '/src/pages/admin/AdsPage'
import PointPage from '/src/pages/admin/PointsRedemptionsPage'

export default function AdminRouter() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* /admin → 회원관리로 리다이렉트 */}
        <Route index element={<Navigate to="/admin/sellers/approvals" replace />} />
        <Route path="sellers/approvals" element={<SellerApprovalsPage />} />
        <Route path="feedbacks/reports" element={<FeedbackReportsPage />} />
        <Route path="ads" element={<AdsPage />} />
        <Route path="point" element={<PointPage />} />

        {/* 잘못된 경로는 /admin/users로 */}
        <Route path="*" element={<Navigate to="/admin/sellers/approvals" replace />} />
      </Route>
    </Routes>
  )
}