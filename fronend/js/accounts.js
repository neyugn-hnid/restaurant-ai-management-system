import {
    ACCOUNT_STATUSES,
    isActiveAccountStatus,
    isInactiveAccountStatus
} from '/js/status-constants.js';
const API_BASE_URL = 'http://localhost:7071/api';
const ACCOUNTS_API_URL = `${API_BASE_URL}/Accounts`;
const ITEMS_PER_PAGE = 10;

// State
let accountsData = [];
const state = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    isLoading: false,
    searchTerm: '',
    roleFilter: '',
    sort: 'name-asc'
};

let accountToDeleteId = null;

async function request(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    if (!response.ok) {
        let message = `API lỗi (${response.status})`;
        try {
            const body = await response.text();
            if (body) message = body;
        } catch (_) {}
        throw new Error(message);
    }

    if (response.status === 204) return null;
    return await response.json();
}

async function loadAndRenderAccounts() {
    if (state.isLoading) return;
    state.isLoading = true;

    const tbody = document.getElementById('accountsTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span></td></tr>';

    try {
        const sortParts = (state.sort || 'name-asc').split('-');
        const sortBy = sortParts[0] === 'name' ? 'fullname' : sortParts[0];
        const sortOrder = sortParts[1] || 'asc';

        const params = new URLSearchParams({
            page: state.currentPage,
            pageSize: ITEMS_PER_PAGE,
            searchTerm: state.searchTerm || '',
            sortBy,
            sortOrder
        });

        const response = await request(`${ACCOUNTS_API_URL}?${params}`);
        accountsData = response?.items || [];
        state.totalPages = response?.totalPages || 1;
        state.totalItems = response?.totalItems || (accountsData.length || 0);

        // If role filter is set, apply locally on returned page items
        let pageItems = accountsData;
        if (state.roleFilter) {
            pageItems = pageItems.filter(a => a.role === state.roleFilter);
        }

        renderAccounts(pageItems);
    } catch (err) {
        console.error('Lỗi khi tải tài khoản:', err);
        const tbody = document.getElementById('accountsTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Lỗi: ${err.message}</td></tr>`;
    } finally {
        state.isLoading = false;
        renderPagination();
    }
}

function getRoleMarkup(role) {
    if (role === 'admin') return '<span class="role-badge role-admin"><span class="material-symbols-outlined" style="font-size: 14px;">admin_panel_settings</span> Quản trị</span>';
    if (role === 'manager') return '<span class="role-badge role-manager"><span class="material-symbols-outlined" style="font-size: 14px;">manage_accounts</span> Quản lý</span>';
    return '<span class="role-badge role-staff"><span class="material-symbols-outlined" style="font-size: 14px;">badge</span> Nhân viên</span>';
}

function getStatusMarkup(status) {
    if (isActiveAccountStatus(status)) {
        return `<span class="badge bg-success bg-opacity-10 text-success border border-success">${ACCOUNT_STATUSES.ACTIVE}</span>`;
    }

    return `<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary">${ACCOUNT_STATUSES.LOCKED}</span>`;
}

// (old local paging/filters removed) use `state` and backend


function renderPagination() {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    const totalPages = Math.max(1, state.totalPages || 1);

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${state.currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="prev">Trước</a>`;
    paginationContainer.appendChild(prevLi);

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${state.currentPage === i ? 'active' : ''}`;
        const activeClasses = state.currentPage === i ? 'bg-primary text-white' : 'text-secondary bg-light';
        li.innerHTML = `<a class="page-link rounded-pill border-0 ${activeClasses} px-3" href="#" data-page="${i}">${i}</a>`;
        paginationContainer.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${state.currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="next">Sau</a>`;
    paginationContainer.appendChild(nextLi);

    paginationContainer.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            if (page === 'prev' && state.currentPage > 1) {
                state.currentPage--;
                loadAndRenderAccounts();
            } else if (page === 'next' && state.currentPage < totalPages) {
                state.currentPage++;
                loadAndRenderAccounts();
            } else if (page !== 'prev' && page !== 'next') {
                state.currentPage = parseInt(page, 10);
                loadAndRenderAccounts();
            }
        });
    });
}

function renderAccounts(data) {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;

    const statTotal = document.getElementById('statTotal');
    const statActive = document.getElementById('statActive');
    const statInactive = document.getElementById('statInactive');

    if (statTotal) statTotal.textContent = state.totalItems || accountsData.length;
    if (statActive) statActive.textContent = (accountsData || []).filter(a => isActiveAccountStatus(a.status)).length;
    if (statInactive) statInactive.textContent = (accountsData || []).filter(a => isInactiveAccountStatus(a.status)).length;

    tbody.innerHTML = '';

    const pageData = data || [];

    if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Không tìm thấy tài khoản nào.</td></tr>';
        renderPagination();
        return;
    }

    pageData.forEach(acc => {
        const displayName = acc.name || acc.fullName || acc.username || 'User';
        const nameParts = displayName.split(' ');
        const initials = nameParts.length > 1
            ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
            : displayName[0];

        const avatarColorClass = isActiveAccountStatus(acc.status) ? 'bg-primary-light text-primary' : 'bg-light text-secondary';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4">
                <div class="d-flex align-items-center gap-3">
                    <div class="avatar ${avatarColorClass} d-flex align-items-center justify-content-center fw-bold text-uppercase" style="width: 40px; height: 40px;">
                        ${initials}
                    </div>
                    <div>
                        <h6 class="mb-0 fw-semibold text-dark">${displayName}</h6>
                    </div>
                </div>
            </td>
            <td class="fw-medium text-dark">@${acc.username}</td>
            <td>${getRoleMarkup(acc.role)}</td>
            <td>${getStatusMarkup(acc.status)}</td>
            <td class="small text-muted">${acc.lastAccess || '-'}</td>
            <td class="text-end pe-4">
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center edit-btn" data-id="${acc.id}" style="width: 32px; height: 32px; border-radius: 50%; color: var(--text-soft) !important; background-color: #fff !important;" title="Sửa" onmouseover="this.style.backgroundColor='#f9f9f9'" onmouseout="this.style.backgroundColor='#fff'">
                        <span class="material-symbols-outlined fs-6">edit</span>
                    </button>
                    <button class="btn btn-light btn-icon border border-danger shadow-sm p-0 d-flex align-items-center justify-content-center text-danger delete-btn" data-id="${acc.id}" style="width: 32px; height: 32px; border-radius: 50%; color: #dc3545 !important; background-color: #fff !important;" title="Xóa" onmouseover="this.style.backgroundColor='#fdf0f0'" onmouseout="this.style.backgroundColor='#fff'">
                        <span class="material-symbols-outlined fs-6">delete</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const acc = accountsData.find(a => String(a.id) === String(id));
            if (acc) {
                document.getElementById('addAccountModalLabel').textContent = 'Sửa tài khoản';
                document.getElementById('accountId').value = acc.id;
                document.getElementById('accountName').value = acc.name || acc.fullName || '';
                document.getElementById('accountUsername').value = acc.username;
                document.getElementById('accountRole').value = acc.role;
                document.getElementById('accountStatus').value = isActiveAccountStatus(acc.status)
                    ? ACCOUNT_STATUSES.ACTIVE
                    : ACCOUNT_STATUSES.LOCKED;

                const modal = new bootstrap.Modal(document.getElementById('addAccountModal'));
                modal.show();
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            accountToDeleteId = e.currentTarget.getAttribute('data-id');
            const acc = accountsData.find(a => String(a.id) === String(accountToDeleteId));
            if (acc && acc.id === 'ACC-001') {
                alert('Không thể xóa quản trị viên mặc định.');
                accountToDeleteId = null;
                return;
            }
            const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
            modal.show();
        });
    });

    renderPagination();
}

document.addEventListener('DOMContentLoaded', () => {
    const accountSearch = document.getElementById('accountSearch');
    const roleFilter = document.getElementById('roleFilter');
    const sortOption = document.getElementById('sortOption');
    // Wire search / filters to backend loader with debounce
    let searchTimeout;
    function applyFilters() {
        state.searchTerm = accountSearch ? accountSearch.value.trim() : '';
        state.roleFilter = roleFilter ? roleFilter.value : '';
        state.sort = sortOption ? sortOption.value : 'name-asc';
        state.currentPage = 1;
        loadAndRenderAccounts();
    }

    if (accountSearch) {
        accountSearch.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFilters, 300);
        });
    }
    if (roleFilter) roleFilter.addEventListener('change', applyFilters);
    if (sortOption) sortOption.addEventListener('change', applyFilters);

    // Initial load
    loadAndRenderAccounts();

    const btnOpenAddModal = document.getElementById('btnOpenAddModal');
    if (btnOpenAddModal) {
        btnOpenAddModal.addEventListener('click', () => {
            document.getElementById('addAccountModalLabel').textContent = 'Thêm tài khoản';
            document.getElementById('accountForm').reset();
            document.getElementById('accountId').value = '';
        });
    }

    const accountForm = document.getElementById('accountForm');
    if (accountForm) {
        accountForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('accountId').value;
            const name = document.getElementById('accountName').value.trim();
            const username = document.getElementById('accountUsername').value.trim();
            const role = document.getElementById('accountRole').value;
            const status = document.getElementById('accountStatus').value;

            try {
                const payload = {
                    fullName: name || null,
                    username,
                    role,
                    status,
                    updatedAt: new Date().toISOString()
                };

                if (id) {
                    // PUT - update
                    await request(`${ACCOUNTS_API_URL}/${encodeURIComponent(id)}`, {
                        method: 'PUT',
                        body: JSON.stringify({ id: Number(id), ...payload })
                    });
                } else {
                    // Create
                    await request(ACCOUNTS_API_URL, {
                        method: 'POST',
                        body: JSON.stringify({ ...payload, createdAt: new Date().toISOString() })
                    });
                }

                // reload
                state.currentPage = 1;
                await loadAndRenderAccounts();

                const modalEl = document.getElementById('addAccountModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            } catch (err) {
                console.error('Lỗi khi lưu tài khoản:', err);
                alert(`Lỗi: ${err.message}`);
            }
        });
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!accountToDeleteId) return;
            try {
                await request(`${ACCOUNTS_API_URL}/${encodeURIComponent(accountToDeleteId)}`, { method: 'DELETE' });
                accountToDeleteId = null;
                await loadAndRenderAccounts();
                const modalEl = document.getElementById('deleteConfirmModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            } catch (err) {
                console.error('Lỗi khi xóa tài khoản:', err);
                alert(`Lỗi: ${err.message}`);
            }
        });
    }
});
