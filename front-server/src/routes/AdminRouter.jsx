import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import AdminLayout from '../components/layouts/AdminLayout'

import SellerApprovalsPage from '../pages/admin/SellerApprovalsPage'
import FeedbackReportsPage from '../pages/admin/FeedbackReportsPage'
import AdsPage from '../pages/admin/AdsPage'
import PointPage from '../pages/admin/PointsRedemptionsPage'
import MemberManagementPage from '../pages/admin/MemberManagementPage' // 1. Import 추가
import QnAManagementPage from '../pages/admin/QnAManagementPage'

export default function AdminRouter() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* /admin → 회원관리로 리다이렉트 */}
        <Route index element={<Navigate to="/admin/member-management" replace />} />
        <Route path="member-management" element={<MemberManagementPage />} />
        <Route path="sellers/approvals" element={<SellerApprovalsPage />} />
        <Route path="feedbacks/reports" element={<FeedbackReportsPage />} />
        <Route path="ads" element={<AdsPage />} />
        <Route path="point" element={<PointPage />} />
        <Route path="qna" element={<QnAManagementPage />} />

        {/* 잘못된 경로는 /admin/users로 */}
        <Route path="*" element={<Navigate to="/admin/member-management" replace />} />
      </Route>
    </Routes>
  )
}