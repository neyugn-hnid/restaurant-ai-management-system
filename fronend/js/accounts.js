import {
    ACCOUNT_STATUSES,
    isActiveAccountStatus,
    isInactiveAccountStatus
} from './status-constants.js';

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:7071/api';
    const ACCOUNTS_API_URL = `${API_BASE_URL}/Accounts`;
    const ITEMS_PER_PAGE = 10;
    const DEFAULT_SORT = 'name-asc';
    const DEBOUNCE_DELAY_MS = 300;

    const ROLE_OPTIONS = [
        { value: '', label: 'Tất cả vai trò' },
        { value: 'admin', label: 'Quản trị viên' },
        { value: 'manager', label: 'Quản lý' },
        { value: 'staff', label: 'Nhân viên' }
    ];

    const SORT_OPTIONS = [
        { value: 'name-asc', label: 'Tên (A-Z)' },
        { value: 'name-desc', label: 'Tên (Z-A)' }
    ];

    const FORM_ROLE_OPTIONS = [
        { value: 'admin', label: 'Quản trị viên' },
        { value: 'manager', label: 'Quản lý' },
        { value: 'staff', label: 'Nhân viên' }
    ];

    const FORM_STATUS_OPTIONS = [
        { value: 'active', label: 'Hoạt động' },
        { value: 'inactive', label: 'Khóa' }
    ];

    const elements = {
        searchInput: document.getElementById('accountSearch'),
        roleFilter: document.getElementById('roleFilter'),
        sortOption: document.getElementById('sortOption'),
        tableBody: document.getElementById('accountsTableBody'),
        formRole: document.getElementById('accountRole'),
        formStatus: document.getElementById('accountStatus'),
        accountForm: document.getElementById('accountForm'),
        accountId: document.getElementById('accountId'),
        accountName: document.getElementById('accountName'),
        accountUsername: document.getElementById('accountUsername'),
        accountPassword: document.getElementById('accountPassword'),
        modalLabel: document.getElementById('addAccountModalLabel'),
        btnOpenAdd: document.getElementById('btnOpenAddModal'),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
        statTotal: document.getElementById('statTotal'),
        statActive: document.getElementById('statActive'),
        statInactive: document.getElementById('statInactive')
    };

    const state = {
        accounts: [],
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        searchTerm: '',
        roleFilter: '',
        sort: DEFAULT_SORT,
        accountToDeleteId: null,
        searchTimeoutId: null
    };

    function renderSelectOptions(selectElement, options, selectedValue) {
        if (!selectElement) return;
        selectElement.innerHTML = options
            .map(opt => `<option value="${opt.value}"${opt.value === selectedValue ? ' selected' : ''}>${opt.label}</option>`)
            .join('');
    }

    async function request(url, options = {}) {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        if (!response.ok) {
            let message = `API lỗi (${response.status})`;
            try { const body = await response.text(); if (body) message = body; } catch (_) {}
            throw new Error(message);
        }
        if (response.status === 204) return null;
        return await response.json();
    }

    function getRoleBadge(role) {
        const config = {
            admin: { cls: 'role-admin', icon: 'admin_panel_settings', label: 'Quản trị' },
            manager: { cls: 'role-manager', icon: 'manage_accounts', label: 'Quản lý' },
            staff: { cls: 'role-badge role-staff', icon: 'badge', label: 'Nhân viên' }
        };
        const c = config[role] || config.staff;
        return `<span class="role-badge ${c.cls}"><span class="material-symbols-outlined icon-sm">${c.icon}</span> ${c.label}</span>`;
    }

    function getStatusBadge(status) {
        if (isActiveAccountStatus(status)) {
            return '<span class="badge bg-success bg-opacity-10 text-success border border-success">Hoạt động</span>';
        }
        return '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary">Khóa</span>';
    }

    async function loadAccounts() {
        if (!elements.tableBody) return;
        elements.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Đang tải...</td></tr>';

        try {
            const sortParts = state.sort.split('-');
            const query = new URLSearchParams({
                page: state.currentPage,
                pageSize: ITEMS_PER_PAGE,
                searchTerm: state.searchTerm,
                sortBy: sortParts[0] === 'name' ? 'fullname' : sortParts[0],
                sortOrder: sortParts[1] || 'asc'
            });

            const resp = await request(`${ACCOUNTS_API_URL}?${query}`);
            state.accounts = resp?.items || [];
            state.totalItems = resp?.totalItemCount || state.accounts.length;
            state.totalPages = Math.ceil(state.totalItems / ITEMS_PER_PAGE) || 1;

            updateStats();
            renderAccounts();
        } catch (err) {
            console.warn('Không thể tải tài khoản từ API:', err.message);
            if (elements.tableBody) {
                elements.tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Lỗi: ${err.message}</td></tr>`;
            }
        }
    }

    function updateStats() {
        if (elements.statTotal) elements.statTotal.textContent = state.totalItems;
        if (elements.statActive) {
            elements.statActive.textContent = state.accounts.filter(a => isActiveAccountStatus(a.status)).length;
        }
        if (elements.statInactive) {
            elements.statInactive.textContent = state.accounts.filter(a => isInactiveAccountStatus(a.status)).length;
        }
    }

    function getFilteredAccounts() {
        return state.accounts.filter(acc => {
            if (state.roleFilter && acc.role !== state.roleFilter) return false;
            return true;
        });
    }

    function renderAccounts() {
        if (!elements.tableBody) return;

        const filtered = getFilteredAccounts();
        if (filtered.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Không tìm thấy tài khoản nào.</td></tr>';
            renderPagination();
            return;
        }

        elements.tableBody.innerHTML = filtered.map(acc => {
            const name = acc.name || acc.fullName || acc.username || 'User';
            const nameParts = name.split(' ');
            const initials = (nameParts.length > 1
                ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
                : name[0]).toUpperCase();
            const avatarCls = isActiveAccountStatus(acc.status)
                ? 'bg-primary-light text-primary'
                : 'bg-light text-secondary';

            return `
                <tr>
                    <td class="ps-4">
                        <div class="d-flex align-items-center gap-3">
                            <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-uppercase ${avatarCls}" style="width:40px;height:40px;">
                                ${initials}
                            </div>
                            <div><h6 class="mb-0 fw-semibold text-dark">${name}</h6></div>
                        </div>
                    </td>
                    <td class="fw-medium text-dark">@${acc.username || '-'}</td>
                    <td>${getRoleBadge(acc.role)}</td>
                    <td>${getStatusBadge(acc.status)}</td>
                    <td class="small text-muted">${acc.lastAccess || '-'}</td>
                    <td class="text-end pe-4">
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center edit-btn" data-id="${acc.id}" title="Sửa" style="width:32px;height:32px;border-radius:50%;color:var(--text-soft) !important;background-color:#fff !important;">
                                <span class="material-symbols-outlined icon-sm">edit</span>
                            </button>
                            <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center delete-btn" data-id="${acc.id}" title="Xóa" style="width:32px;height:32px;border-radius:50%;color:#dc3545 !important;background-color:#fff !important;">
                                <span class="material-symbols-outlined icon-sm">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        bindRowButtons();
        renderPagination();
    }

    function bindRowButtons() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const acc = state.accounts.find(a => String(a.id) === String(id));
                if (!acc) return;

                elements.modalLabel.textContent = 'Sửa tài khoản';
                elements.accountId.value = acc.id;
                elements.accountName.value = acc.name || acc.fullName || '';
                elements.accountUsername.value = acc.username || '';
                elements.formRole.value = acc.role || 'staff';
                elements.formStatus.value = isActiveAccountStatus(acc.status) ? 'active' : 'inactive';

                new bootstrap.Modal(document.getElementById('addAccountModal')).show();
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const acc = state.accounts.find(a => String(a.id) === String(id));
                if (acc && acc.id === 'ACC-001') {
                    alert('Không thể xóa quản trị viên mặc định.');
                    return;
                }
                state.accountToDeleteId = id;
                new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
            });
        });
    }

    function renderPagination() {
        const container = document.querySelector('.pagination');
        if (!container) return;

        container.innerHTML = '';
        const totalPages = Math.max(1, state.totalPages);

        const addBtn = (label, page, disabled) => {
            const li = document.createElement('li');
            li.className = `page-item${disabled ? ' disabled' : ''}`;
            li.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="${page}">${label}</a>`;
            container.appendChild(li);
        };

        addBtn('Trước', 'prev', state.currentPage === 1);

        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item${state.currentPage === i ? ' active' : ''}`;
            const cls = state.currentPage === i ? 'bg-primary text-white' : 'text-secondary bg-light';
            li.innerHTML = `<a class="page-link rounded-pill border-0 ${cls} px-3" href="#" data-page="${i}">${i}</a>`;
            container.appendChild(li);
        }

        addBtn('Sau', 'next', state.currentPage === totalPages);

        container.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                const page = a.dataset.page;
                if (page === 'prev' && state.currentPage > 1) state.currentPage--;
                else if (page === 'next' && state.currentPage < totalPages) state.currentPage++;
                else if (page !== 'prev' && page !== 'next') state.currentPage = parseInt(page, 10);
                loadAccounts();
            });
        });
    }

    function applyFilters() {
        state.searchTerm = elements.searchInput?.value.trim() || '';
        state.roleFilter = elements.roleFilter?.value || '';
        state.sort = elements.sortOption?.value || DEFAULT_SORT;
        state.currentPage = 1;
        loadAccounts();
    }

    async function handleFormSubmit(e) {
        if (e) e.preventDefault();
        const id = elements.accountId?.value || '';
        const name = elements.accountName?.value?.trim() || '';
        const username = elements.accountUsername?.value?.trim() || '';
        const role = elements.formRole?.value || 'staff';
        const status = elements.formStatus?.value || 'active';
        const password = elements.accountPassword?.value || '';

        if (!username) { alert('Vui lòng nhập Username!'); return; }
        if (!name) { alert('Vui lòng nhập Tên hiển thị!'); return; }

        const payload = { fullName: name || null, username, role, status, updatedAt: new Date().toISOString() };

        try {
            if (id) {
                const updatePayload = { ...payload, id: Number(id) };
                if (password) updatePayload.passwordHash = password;
                await request(`${ACCOUNTS_API_URL}/${encodeURIComponent(id)}`, {
                    method: 'PUT', body: JSON.stringify(updatePayload)
                });
            } else {
                await request(ACCOUNTS_API_URL, {
                    method: 'POST', body: JSON.stringify({
                        ...payload,
                        passwordHash: password || 'admin123',
                        createdAt: new Date().toISOString()
                    })
                });
            }
            await loadAccounts();
            const modal = bootstrap.Modal.getInstance(document.getElementById('addAccountModal'));
            if (modal) modal.hide();
        } catch (err) {
            alert(`Lỗi: ${err.message}`);
        }
    }

    function bindEvents() {
        const saveBtn = document.querySelector('#addAccountModal button[type="submit"]');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleFormSubmit(e);
            });
        }

        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', () => {
                clearTimeout(state.searchTimeoutId);
                state.searchTimeoutId = setTimeout(applyFilters, DEBOUNCE_DELAY_MS);
            });
        }
        elements.roleFilter?.addEventListener('change', applyFilters);
        elements.sortOption?.addEventListener('change', applyFilters);
        elements.accountForm?.addEventListener('submit', handleFormSubmit);

        elements.btnOpenAdd?.addEventListener('click', () => {
            elements.modalLabel.textContent = 'Thêm tài khoản';
            elements.accountId.value = '';
            elements.accountName.value = '';
            elements.accountUsername.value = '';
            if (elements.accountPassword) elements.accountPassword.value = '';
            if (elements.formRole) elements.formRole.value = 'staff';
            if (elements.formStatus) elements.formStatus.value = 'active';
        });

        elements.confirmDeleteBtn?.addEventListener('click', async () => {
            if (!state.accountToDeleteId) return;
            try {
                await request(`${ACCOUNTS_API_URL}/${encodeURIComponent(state.accountToDeleteId)}`, { method: 'DELETE' });
                state.accountToDeleteId = null;
                await loadAccounts();
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'));
                if (modal) modal.hide();
            } catch (err) {
                alert(`Lỗi: ${err.message}`);
            }
        });
    }

    renderSelectOptions(elements.roleFilter, ROLE_OPTIONS, '');
    renderSelectOptions(elements.sortOption, SORT_OPTIONS, DEFAULT_SORT);
    renderSelectOptions(elements.formRole, FORM_ROLE_OPTIONS, 'staff');
    renderSelectOptions(elements.formStatus, FORM_STATUS_OPTIONS, 'active');

    bindEvents();
    loadAccounts();
});
