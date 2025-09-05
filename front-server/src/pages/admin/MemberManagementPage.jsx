import React, { useEffect, useState, useMemo } from 'react';
import BaseTable from '../../components/common/table/BaseTable';
import Button from '../../components/common/Button';
import TableToolbar from '../../components/common/table/TableToolbar';
import { adminSearchUsers, adminSanctionUser } from '../../service/adminUserService';

// 날짜 포맷 유틸
const fmtDateTime = (iso) => {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleString('ko-KR');
    } catch {
        return '-';
    }
};

const ROLE_STATUS_CHIPS = [
    { value: 'ALL', label: '전체' },
    { value: 'USER', label: '사용자' },
    { value: 'SELLER', label: '셀러' },
];

const MemberManagementPage = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [size] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    
    const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL', 'USER', 'SELLER'
    const [searchTerm, setSearchTerm] = useState('');
    const [sanctionDurations, setSanctionDurations] = useState({}); // { [userId]: '3d' }

    const totalPages = useMemo(() => Math.max(1, Math.ceil(totalElements / size)), [totalElements, size]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminSearchUsers({
                q: searchTerm,
                role: roleFilter,
                page,
                size,
            });
            setRows(data?.content ?? []);
            setTotalElements(data?.totalElements ?? 0);
        } catch (e) {
            alert('회원 목록을 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, roleFilter]);

    const handleSanction = async (userId) => {
        const duration = sanctionDurations[userId];
        if (!duration) {
            alert('제재 기간을 선택해주세요.');
            return;
        }

        let sanctionUntil = null;
        const now = new Date();
        if (duration !== 'release') {
            if (duration.endsWith('d')) {
                now.setDate(now.getDate() + parseInt(duration));
            } else if (duration === 'permanent') {
                now.setFullYear(now.getFullYear() + 100);
            }
            sanctionUntil = now.toISOString().slice(0, 19);
        }

        try {
            await adminSanctionUser(userId, sanctionUntil);
            alert('제재가 적용되었습니다.');
            fetchUsers(); // 목록 새로고침
        } catch (e) {
            alert('제재 적용에 실패했습니다.');
        }
    };

    const columns = [
        { header: '유저 닉네임', key: 'nickname' },
        { header: '상호명', key: 'shopName', render: (r) => r.shopName || '-' },
        { header: 'Role', key: 'role', width: 100 },
        { 
            header: '제재 이력',
            key: 'sanctionHistory',
            width: 100,
            render: (r) => r.sanctionedUntil && new Date(r.sanctionedUntil) > new Date() ? 'O' : 'X'
        },
        { 
            header: '제재',
            key: 'sanction',
            width: 250,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <select
                        className="h-9 rounded-md border px-2 text-sm"
                        value={sanctionDurations[row.id] || ''}
                        onChange={(e) => setSanctionDurations(prev => ({ ...prev, [row.id]: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <option value="">기간 선택</option>
                        <option value="3d">3일</option>
                        <option value="7d">7일</option>
                        <option value="permanent">영구</option>
                        <option value="release">해제</option>
                    </select>
                    <Button variant='admin' size="md" onClick={(e) => { e.stopPropagation(); handleSanction(row.id); }}>
                        적용
                    </Button>
                </div>
            )
        },
    ];

    return (
        <div>
            <h2 className="mb-4 text-xl font-semibold">회원 관리</h2>
            <TableToolbar
                searchPlaceholder="닉네임, 이메일, 상호명 검색"
                searchValue={searchTerm}
                onChangeSearch={setSearchTerm}
                onSubmitSearch={fetchUsers}
                onReset={() => {
                    setSearchTerm('');
                    setRoleFilter('ALL');
                    setPage(0);
                }}
                // --- 필터(토글) 기능에 필요한 props 전달 ---
                statusChips={ROLE_STATUS_CHIPS}
                selectedStatus={roleFilter}
                onSelectStatus={setRoleFilter} // 필터 상태 변경 함수 전달
            />

            <BaseTable
                columns={columns}
                data={rows}
                rowKey="id"
                emptyText={loading ? '회원 목록을 불러오는 중...' : '해당 조건의 회원이 없습니다.'}
            />

            {/* Pagination */}
            <div className="mt-4 flex justify-center items-center gap-2">
                <Button variant='signUp' className='text-sub' onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>이전</Button>
                <span>{page + 1} / {totalPages}</span>
                <Button variant='signUp' className='text-sub' onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page + 1 >= totalPages}>다음</Button>
            </div>
        </div>
    );
};

export default MemberManagementPage;