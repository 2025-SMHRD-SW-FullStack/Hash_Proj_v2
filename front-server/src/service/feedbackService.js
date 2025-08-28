import api from '../config/axiosInstance'


export const fetchSellerFeedbacks = async ({ page = 0, size = 50 } = {}) => {
    const res = await api.get('/api/seller/feedbacks', { params: { page, size } })
    return res.data
}


export const reportFeedback = async ({ feedbackId, reason }) => {
    const res = await api.post(`/api/feedbacks/${feedbackId}/report`, { reason })
    return res.data
}