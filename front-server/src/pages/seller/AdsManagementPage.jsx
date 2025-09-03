// /src/pages/seller/AdsManagementPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { fetchMyAds, updateAdStatus } from '/src/service/adsService'
import { AD_STATUS } from '/src/constants/ads'

const box = 'rounded-xl border bg-white p-4 shadow-sm'

const statusColors = {
  [AD_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [AD_STATUS.ACTIVE]: 'bg-green-100 text-green-800',
  [AD_STATUS.PAUSED]: 'bg-gray-100 text-gray-800',
  [AD_STATUS.COMPLETED]: 'bg-blue-100 text-blue-800',
  [AD_STATUS.CANCELLED]: 'bg-red-100 text-red-800',
}

const statusLabels = {
  [AD_STATUS.PENDING]: '대기중',
  [AD_STATUS.ACTIVE]: '활성',
  [AD_STATUS.PAUSED]: '일시정지',
  [AD_STATUS.COMPLETED]: '완료',
  [AD_STATUS.CANCELLED]: '취소됨',
}

export default function AdsManagementPage() {
  const navigate = useNavigate()
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadAds()
  }, [filter])

  const loadAds = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filter !== 'all') {
        params.status = filter
      }
      const data = await fetchMyAds(params)
      setAds(Array.isArray(data) ? data : (data?.content || []))
    } catch (error) {
      console.error('광고 목록 로드 실패:', error)
      alert('광고 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (adId, newStatus) => {
    try {
      await updateAdStatus({ adId, status: newStatus })
      alert('광고 상태가 변경되었습니다.')
      loadAds() // 목록 새로고침
    } catch (error) {
      console.error('상태 변경 실패:', error)
      alert('광고 상태 변경에 실패했습니다.')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price || 0)
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">광고 관리</h1>
        <Button onClick={() => navigate('/seller/ads/power')}>
          새 광고 신청
        </Button>
      </div>

      {/* 필터 */}
      <div className={`${box} mb-4`}>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">상태별 필터:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">전체</option>
            <option value={AD_STATUS.PENDING}>대기중</option>
            <option value={AD_STATUS.ACTIVE}>활성</option>
            <option value={AD_STATUS.PAUSED}>일시정지</option>
            <option value={AD_STATUS.COMPLETED}>완료</option>
            <option value={AD_STATUS.CANCELLED}>취소됨</option>
          </select>
        </div>
      </div>

      {/* 광고 목록 */}
      <div className={`${box}`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 text-6xl">📢</div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">등록된 광고가 없습니다</h3>
            <p className="mb-4 text-gray-500">새로운 광고를 신청하여 상품을 홍보해보세요!</p>
            <Button onClick={() => navigate('/seller/ads/power')}>
              광고 신청하기
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-gray-500">
                  <th className="pb-3 pl-4">광고 정보</th>
                  <th className="pb-3">위치</th>
                  <th className="pb-3">기간</th>
                  <th className="pb-3">상태</th>
                  <th className="pb-3">금액</th>
                  <th className="pb-3">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-gray-50">
                    <td className="py-4 pl-4">
                      <div className="flex items-start gap-3">
                        {ad.imageUrl && (
                          <img
                            src={ad.imageUrl}
                            alt="광고 이미지"
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {ad.title || '제목 없음'}
                          </div>
                          {ad.description && (
                            <div className="mt-1 text-sm text-gray-500">
                              {ad.description}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-gray-400">
                            ID: {ad.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-gray-900">{ad.positionLabel || ad.position}</div>
                      {ad.category && (
                        <div className="text-xs text-gray-500">{ad.category}</div>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="text-sm text-gray-900">
                        {formatDate(ad.startDate)} ~ {formatDate(ad.endDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ad.period}일
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[ad.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[ad.status] || ad.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(ad.price)}원
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-2">
                        {ad.status === AD_STATUS.ACTIVE && (
                          <Button
                            size="sm"
                            variant="unselected"
                            onClick={() => handleStatusChange(ad.id, AD_STATUS.PAUSED)}
                          >
                            일시정지
                          </Button>
                        )}
                        {ad.status === AD_STATUS.PAUSED && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(ad.id, AD_STATUS.ACTIVE)}
                          >
                            재개
                          </Button>
                        )}
                        {ad.status === AD_STATUS.PENDING && (
                          <Button
                            size="sm"
                            variant="unselected"
                            onClick={() => handleStatusChange(ad.id, AD_STATUS.CANCELLED)}
                          >
                            취소
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 통계 정보 */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`${box} text-center`}>
          <div className="text-2xl font-bold text-blue-600">
            {ads.filter(ad => ad.status === AD_STATUS.ACTIVE).length}
          </div>
          <div className="text-sm text-gray-600">활성 광고</div>
        </div>
        <div className={`${box} text-center`}>
          <div className="text-2xl font-bold text-yellow-600">
            {ads.filter(ad => ad.status === AD_STATUS.PENDING).length}
          </div>
          <div className="text-sm text-gray-600">대기중</div>
        </div>
        <div className={`${box} text-center`}>
          <div className="text-2xl font-bold text-green-600">
            {ads.filter(ad => ad.status === AD_STATUS.COMPLETED).length}
          </div>
          <div className="text-sm text-gray-600">완료</div>
        </div>
        <div className={`${box} text-center`}>
          <div className="text-2xl font-bold text-gray-600">
            {formatPrice(ads.reduce((sum, ad) => sum + (ad.price || 0), 0))}원
          </div>
          <div className="text-sm text-gray-600">총 투자 금액</div>
        </div>
      </div>
    </div>
  )
}
