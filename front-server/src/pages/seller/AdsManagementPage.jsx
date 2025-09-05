// /src/pages/seller/AdsManagementPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button'
import { fetchMyAds } from '/src/service/adsService'
import { AD_STATUS, AD_STATUS_COLOR, AD_STATUS_LABEL } from '/src/constants/ads'

const box = 'rounded-xl border bg-white p-4 shadow-sm'

export default function AdsManagementPage() {
  const navigate = useNavigate()
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadAds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const loadAds = async () => {

    try {
      setLoading(true)
      const params = {}
      if (filter !== 'all') params.status = filter
      const data = await fetchMyAds(params)

      setAds(Array.isArray(data?.content) ? data.content : [])
    } catch (error) {
      console.error('광고 목록 로드 실패:', error)
      alert('광고 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('ko-KR')
    } catch {
      return dateString
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ko-KR').format(price || 0)
  }

  return (
    <div className="mx-auto w/full max-w-[1120px] px-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">광고 관리</h1>
        <Button variant='admin' onClick={() => navigate('/seller/ads/power')}>
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
            <option value={AD_STATUS.RESERVED_UNPAID}>{AD_STATUS_LABEL[AD_STATUS.RESERVED_UNPAID]}</option>
            <option value={AD_STATUS.RESERVED_PAID}>{AD_STATUS_LABEL[AD_STATUS.RESERVED_PAID]}</option>
            <option value={AD_STATUS.ACTIVE}>{AD_STATUS_LABEL[AD_STATUS.ACTIVE]}</option>
            <option value={AD_STATUS.COMPLETED}>{AD_STATUS_LABEL[AD_STATUS.COMPLETED]}</option>
            <option value={AD_STATUS.CANCELLED}>{AD_STATUS_LABEL[AD_STATUS.CANCELLED]}</option>
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
          <div className="overflow-x-auto text-center">
            <table className="w-full">
              <thead>
                <tr className="border-b text-center text-sm font-medium text-gray-500">
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
                    {/* 1. '위치' 열: 이미지와 텍스트를 한 셀에 넣기 */}
                    <td className="py-4 pl-4">
                      <div className="flex items-start gap-3">
                        {ad.imageUrl && (
                          <img
                            src={ad.imageUrl}
                            alt="광고 이미지"
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            {ad.positionLabel || ad.position}
                          </div>
                          {ad.category && (
                            <div className="text-xs text-gray-500">{ad.category}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. '기간' 열 */}
                    <td className="py-4">
                      <div className="text-sm text-gray-900">
                        {formatDate(ad.startDate)} ~ {formatDate(ad.endDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ad.period ? `${ad.period}일` : '-'}
                      </div>
                    </td>

                    {/* 3. '상태' 열 */}
                    <td className="py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${AD_STATUS_COLOR[ad.status] || 'bg-gray-100 text-gray-800'}`}>
                        {AD_STATUS_LABEL[ad.status] || ad.status}
                      </span>
                    </td>

                    {/* 4. '금액' 열 */}
                    <td className="py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(ad.price)}원
                      </div>
                    </td>

                    {/* 5. '관리' 열 (원래 코드에 없었으므로 필요하다면 추가) */}
                    <td className="py-4 text-center">
                      {/* 여기에 관리 버튼이나 링크 등 추가 */}
                      -
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
          <div className="text-2xl font-bold text-green-600">
            {ads.filter(ad => ad.status === AD_STATUS.ACTIVE).length}
          </div>
          <div className="text-sm text-gray-600">활성</div>
        </div>
        <div className={`${box} text-center`}>
          <div className="text-2xl font-bold text-amber-600">
            {ads.filter(ad => ad.status === AD_STATUS.RESERVED_PAID).length}
          </div>
          <div className="text-sm text-gray-600">대기중(결제완료)</div>
        </div>
        <div className={`${box} text-center`}>
          <div className="text-2xl font-bold text-yellow-600">
            {ads.filter(ad => ad.status === AD_STATUS.RESERVED_UNPAID).length}
          </div>
          <div className="text-sm text-gray-600">대기중(미결제)</div>
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
