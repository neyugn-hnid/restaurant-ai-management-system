import {
    ACCOUNT_STATUSES,
    isActiveAccountStatus,
    isInactiveAccountStatus
} from '/js/status-constants.js';

const STORAGE_KEY_ACCOUNTS = 'bistro_accounts';

let accountsData = JSON.parse(localStorage.getItem(STORAGE_KEY_ACCOUNTS));
if (!accountsData || accountsData.length === 0) {
    accountsData = window.BistroMockData?.MOCK_ACCOUNTS || [];
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accountsData));
}

let accountToDeleteId = null;

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

let currentPage = 1;
const itemsPerPage = 10;
let filteredData = [];

function renderPagination() {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';

    const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="prev">Trước</a>`;
    paginationContainer.appendChild(prevLi);

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${currentPage === i ? 'active' : ''}`;
        const activeClasses = currentPage === i ? 'bg-primary text-white' : 'text-secondary bg-light';
        li.innerHTML = `<a class="page-link rounded-pill border-0 ${activeClasses} px-3" href="#" data-page="${i}">${i}</a>`;
        paginationContainer.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="next">Sau</a>`;
    paginationContainer.appendChild(nextLi);

    paginationContainer.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            if (page === 'prev' && currentPage > 1) {
                currentPage--;
                renderAccounts(filteredData);
            } else if (page === 'next' && currentPage < totalPages) {
                currentPage++;
                renderAccounts(filteredData);
            } else if (page !== 'prev' && page !== 'next') {
                currentPage = parseInt(page, 10);
                renderAccounts(filteredData);
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

    if (statTotal) statTotal.textContent = accountsData.length;
    if (statActive) statActive.textContent = accountsData.filter(a => isActiveAccountStatus(a.status)).length;
    if (statInactive) statInactive.textContent = accountsData.filter(a => isInactiveAccountStatus(a.status)).length;

    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = data.slice(startIndex, endIndex);

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
                        <small class="text-muted">ID: ${acc.id}</small>
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

    function applyFilters() {
        const query = accountSearch ? accountSearch.value.toLowerCase() : '';
        const role = roleFilter ? roleFilter.value : '';
        const sort = sortOption ? sortOption.value : 'name-asc';

        filteredData = accountsData.filter(a => {
            const tempName = a.name || a.fullName || a.username || '';
            const matchQuery = tempName.toLowerCase().includes(query) || a.username.toLowerCase().includes(query);
            const matchRole = role && role !== '' && role !== 'Tất cả' ? a.role === role : true;
            return matchQuery && matchRole;
        });

        filteredData.sort((a, b) => {
            const tempNameA = a.name || a.fullName || a.username || '';
            const tempNameB = b.name || b.fullName || b.username || '';
            if (sort === 'name-asc') return tempNameA.localeCompare(tempNameB);
            if (sort === 'name-desc') return tempNameB.localeCompare(tempNameA);
            return 0;
        });

        currentPage = 1;
        renderAccounts(filteredData);
    }

    applyFilters();

    if (accountSearch) accountSearch.addEventListener('input', applyFilters);
    if (roleFilter) roleFilter.addEventListener('change', applyFilters);
    if (sortOption) sortOption.addEventListener('change', applyFilters);

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
        accountForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('accountId').value;
            const name = document.getElementById('accountName').value;
            const username = document.getElementById('accountUsername').value;
            const role = document.getElementById('accountRole').value;
            const status = document.getElementById('accountStatus').value;

            if (id) {
                const index = accountsData.findIndex(a => String(a.id) === String(id));
                if (index !== -1) {
                    accountsData[index] = {
                        ...accountsData[index],
                        name,
                        username,
                        role,
                        status
                    };
                }
            } else {
                if (accountsData.some(a => a.username === username)) {
                    alert('Username đã tồn tại!');
                    return;
                }
                const newAcc = {
                    id: `ACC-${Math.floor(100 + Math.random() * 900)}`,
                    name,
                    username,
                    role,
                    status,
                    lastAccess: 'Vừa tạo'
                };
                accountsData.push(newAcc);
            }

            localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accountsData));
            applyFilters();

            const modalEl = document.getElementById('addAccountModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        });
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (accountToDeleteId) {
                accountsData = accountsData.filter(a => String(a.id) !== String(accountToDeleteId));
                localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accountsData));
                applyFilters();

                accountToDeleteId = null;
                const modalEl = document.getElementById('deleteConfirmModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }
        });
    }
});
