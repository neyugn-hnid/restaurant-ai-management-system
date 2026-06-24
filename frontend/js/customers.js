document.addEventListener('DOMContentLoaded', () => {
    const FV = window.FormValidation;
    const API_BASE_URL = window.API_BASE_URL;
    const CUSTOMERS_API_URL = `${API_BASE_URL}/Customers`;
    const ITEMS_PER_PAGE = 10;
    const RANK_FILTER_OPTIONS = [
        { value: 'Tất cả', label: 'Tất cả hạng' },
        { value: 'Mới', label: 'Mới' },
        { value: 'Silver', label: 'Silver' },
        { value: 'Gold', label: 'Gold' },
        { value: 'Platinum', label: 'Platinum' }
    ];
    const SORT_OPTIONS = [
        { value: 'spend-desc', label: 'Chi tiêu (Cao - Thấp)' },
        { value: 'spend-asc', label: 'Chi tiêu (Thấp - Cao)' },
        { value: 'orders-desc', label: 'Số đơn (Nhiều - Ít)' },
        { value: 'orders-asc', label: 'Số đơn (Ít - Nhiều)' }
    ];
    const FORM_RANK_OPTIONS = [
        { value: 'new', label: 'Mới' },
        { value: 'silver', label: 'Silver' },
        { value: 'gold', label: 'Gold' },
        { value: 'platinum', label: 'Platinum' }
    ];
    const elements = {
        searchInput: document.getElementById('customerSearch'),
        rankFilter: document.getElementById('rankFilter'),
        sortOption: document.getElementById('sortOption'),
        tableBody: document.getElementById('customersTableBody'),
        customerForm: document.getElementById('customerForm'),
        customerId: document.getElementById('customerId'),
        customerName: document.getElementById('customerName'),
        customerPhone: document.getElementById('customerPhone'),
        customerEmail: document.getElementById('customerEmail'),
        customerRank: document.getElementById('customerRank'),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
        statTotal: document.getElementById('statTotalCustomers'),
        statVip: document.getElementById('statVipGold'),
        statNew: document.getElementById('statNewCustomers'),
        statReturn: document.getElementById('statReturnRate'),
        paginationInfo: document.getElementById('customersPaginationInfo')
    };
    function getCurrentUserRole() {
        if (window.Auth?.getRole) {
            return window.Auth.getRole();
        }
        const user = window.Auth?.getUser?.();
        const rawRole = String(user?.role || (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) || 'Staff')
            .trim()
            .toUpperCase()
            .replace(/^ROLE_/, '');
        if (rawRole === 'STAFF' || rawRole === 'EMPLOYEE' || rawRole === 'NHANVIEN' || rawRole === 'NHAN_VIEN') {
            return 'Staff';
        }
        return rawRole.charAt(0) + rawRole.slice(1).toLowerCase();
    }
    const isStaffRole = getCurrentUserRole() === 'Staff';
    const state = {
        customers: [],
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        searchTerm: '',
        rankFilter: 'Tất cả',
        sort: 'spend-desc',
        customerToDeleteId: null
    };
    function renderSelectOptions(selectElement, options, selectedValue) {
        if (!selectElement) return;
        selectElement.innerHTML = options
            .map(opt => `<option value="${opt.value}"${opt.value === selectedValue ? ' selected' : ''}>${opt.label}</option>`)
            .join('');
    }
    async function request(url, options = {}) {
        const resp = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        if (!resp.ok) {
            let msg = `API lỗi (${resp.status})`;
            try { const b = await resp.text(); if (b) msg = b; } catch (_) {}
            throw new Error(msg);
        }
        if (resp.status === 204) return null;
        return resp.json();
    }
    function showToast(message, type = 'success') {
        const toast = document.getElementById('liveToast');
        const msg = document.getElementById('toastMessage');
        if (!toast || !msg) { alert(message); return; }
        msg.textContent = message;
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        new bootstrap.Toast(toast, { delay: 3000 }).show();
    }
    function getRankBadge(tier) {
        const config = {
            platinum: 'bg-dark text-white',
            gold: 'bg-warning text-dark',
            silver: 'bg-secondary text-white',
            member: 'bg-info text-white',
            new: 'bg-light text-dark'
        };
        const cls = config[tier?.toLowerCase()] || config.new;
        return `<span class="badge ${cls}">${tier || 'Mới'}</span>`;
    }
    async function loadCustomers() {
        if (!elements.tableBody) return;
        elements.tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Đang tải...</td></tr>';
        try {
            const sortParts = state.sort.split('-');
            const sortBy = sortParts[0] === 'spend' ? 'totalSpent' : sortParts[0] === 'orders' ? 'visits' : 'createdAt';
            const query = new URLSearchParams({
                page: state.currentPage,
                pageSize: ITEMS_PER_PAGE,
                searchTerm: state.searchTerm,
                sortBy,
                sortOrder: sortParts[1] || 'desc'
            });
            const resp = await request(`${CUSTOMERS_API_URL}?${query}`);
            state.customers = (resp?.items || []).map(c => ({
                id: c.id, name: c.fullName || c.name || '', phone: c.phone || '',
                email: c.email || '', tier: c.tier || 'new',
                visits: c.visits || 0, totalSpent: c.totalSpent || 0,
                lastVisit: c.lastVisit || c.updatedAt || c.createdAt || ''
            }));
            state.totalItems = resp?.totalItemCount || state.customers.length;
            state.totalPages = Math.ceil(state.totalItems / ITEMS_PER_PAGE) || 1;
            localStorage.setItem('bistro_customers', JSON.stringify(state.customers));
        } catch (err) {
            console.warn('Không thể tải khách hàng từ API:', err.message);
            state.customers = JSON.parse(localStorage.getItem('bistro_customers') || '[]');
            state.totalItems = state.customers.length;
            state.totalPages = Math.ceil(state.totalItems / ITEMS_PER_PAGE) || 1;
        }
        updateStats();
        renderCustomers();
    }
    function updateStats() {
        const setVal = (el, val) => { if (el) el.textContent = val; };
        setVal(elements.statTotal, state.totalItems.toLocaleString('vi-VN'));
        setVal(elements.statVip, state.customers.filter(c => c.tier === 'gold' || c.tier === 'platinum').length.toLocaleString('vi-VN'));
        setVal(elements.statNew, state.customers.filter(c => c.tier === 'new').length.toLocaleString('vi-VN'));
        const returning = state.customers.filter(c => c.visits > 1).length;
        const rate = state.totalItems > 0 ? Math.round((returning / state.totalItems) * 100) : 0;
        setVal(elements.statReturn, rate + '%');
        if (elements.paginationInfo) {
            const start = state.totalItems > 0 ? (state.currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
            const end = Math.min(state.currentPage * ITEMS_PER_PAGE, state.totalItems);
            elements.paginationInfo.textContent = `Hiển thị ${start} - ${end} trong số ${state.totalItems.toLocaleString('vi-VN')} khách hàng`;
        }
    }
    function getFilteredCustomers() {
        return state.customers.filter(c => {
            if (state.rankFilter !== 'Tất cả' && c.tier?.toLowerCase() !== state.rankFilter.toLowerCase()) return false;
            if (state.searchTerm) {
                const s = state.searchTerm.toLowerCase();
                return (c.name || '').toLowerCase().includes(s) || (c.phone || '').includes(s);
            }
            return true;
        });
    }
    function renderCustomers() {
        if (!elements.tableBody) return;
        const filtered = getFilteredCustomers();
        const start = (state.currentPage - 1) * ITEMS_PER_PAGE;
        const pageData = filtered.slice(start, start + ITEMS_PER_PAGE);
        if (pageData.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Không tìm thấy khách hàng nào.</td></tr>';
            renderPagination();
            return;
        }
        elements.tableBody.innerHTML = pageData.map(c => {
            const initials = (c.name || 'KH').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            return `
                <tr>
                    <td class="ps-4">
                        <div class="d-flex align-items-center gap-3">
                            <div class="rounded-circle bg-primary-light text-primary d-flex align-items-center justify-content-center fw-bold" style="width:40px;height:40px;">${initials}</div>
                            <div><h6 class="mb-0 fw-semibold text-dark">${c.name || 'Khách'}</h6></div>
                        </div>
                    </td>
                    <td><div>${c.phone || '-'}</div><small class="text-muted">${c.email || ''}</small></td>
                    <td>${getRankBadge(c.tier)}</td>
                    <td class="fw-semibold">${c.visits || 0}</td>
                    <td class="fw-semibold">${(c.totalSpent || 0).toLocaleString('vi-VN')} ₫</td>
                    <td class="small text-muted">${c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('vi-VN') : '-'}</td>
                    <td class="text-end pe-4">
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center edit-customer-btn" data-id="${c.id}" title="Sửa" style="width:32px;height:32px;border-radius:50%;color:var(--text-soft) !important;background-color:#fff !important;">
                                <span class="material-symbols-outlined icon-sm">edit</span>
                            </button>
                            ${isStaffRole ? '' : `
                            <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center delete-customer-btn" data-id="${c.id}" title="Xóa" style="width:32px;height:32px;border-radius:50%;color:#dc3545 !important;background-color:#fff !important;">
                                <span class="material-symbols-outlined icon-sm">delete</span>
                            </button>
                            `}
                        </div>
                    </td>
                </tr>`;
        }).join('');
        bindRowButtons();
        renderPagination();
    }
    function bindRowButtons() {
        document.querySelectorAll('.edit-customer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const c = state.customers.find(x => String(x.id) === String(btn.dataset.id));
                if (!c) return;
                document.getElementById('addCustomerModalLabel').textContent = 'Sửa khách hàng';
                elements.customerId.value = c.id;
                elements.customerName.value = c.name || '';
                elements.customerPhone.value = c.phone || '';
                elements.customerEmail.value = c.email || '';
                elements.customerRank.value = c.tier || 'new';
                new bootstrap.Modal(document.getElementById('addCustomerModal')).show();
            });
        });
        document.querySelectorAll('.delete-customer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.customerToDeleteId = btn.dataset.id;
                new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
            });
        });
    }
    function renderPagination() {
        const container = document.querySelector('.pagination');
        if (!container) return;
        const filtered = getFilteredCustomers();
        const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        container.innerHTML = '';
        const addBtn = (label, page, disabled) => {
            const li = document.createElement('li');
            li.className = `page-item${disabled ? ' disabled' : ''}`;
            li.innerHTML = `<a class="page-link border text-secondary bg-white px-3" style="border-radius:0;" href="#" data-page="${page}">${label}</a>`;
            container.appendChild(li);
        };
        addBtn('Trước', 'prev', state.currentPage === 1);
        addBtn('Sau', 'next', state.currentPage === totalPages);
        container.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                const page = a.dataset.page;
                if (page === 'prev' && state.currentPage > 1) state.currentPage--;
                else if (page === 'next' && state.currentPage < totalPages) state.currentPage++;
                renderCustomers();
            });
        });
    }
    function bindEvents() {
        document.getElementById('addCustomerModal')?.addEventListener('show.bs.modal', (e) => {
            if (e.relatedTarget?.id === 'btnOpenAddModal' || !elements.customerId.value) {
                document.getElementById('addCustomerModalLabel').textContent = 'Thông tin khách hàng';
                elements.customerForm?.reset();
                elements.customerId.value = '';
            }
        });
        elements.searchInput?.addEventListener('input', () => {
            state.searchTerm = elements.searchInput.value.trim().toLowerCase();
            state.currentPage = 1;
            renderCustomers();
        });
        elements.rankFilter?.addEventListener('change', () => {
            state.rankFilter = elements.rankFilter.value;
            state.currentPage = 1;
            renderCustomers();
        });
        elements.sortOption?.addEventListener('change', () => {
            state.sort = elements.sortOption.value;
            state.currentPage = 1;
            loadCustomers();
        });
    elements.customerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = elements.customerId.value;
        const fullName = FV?.normalizeWhitespace(elements.customerName.value) || elements.customerName.value.trim();
        const phone = elements.customerPhone.value.trim();
        const email = elements.customerEmail.value.trim();
        let isValid = true;
        FV?.clearFormErrors(elements.customerForm);
        if (!fullName) {
            isValid = FV ? FV.setFieldError(elements.customerName, 'Vui lòng nhập tên khách hàng.') : false;
        } else if (fullName.length < 2 || fullName.length > 100) {
            isValid = FV ? FV.setFieldError(elements.customerName, 'Tên khách hàng phải từ 2 đến 100 ký tự.') : false;
        } else {
            elements.customerName.value = fullName;
            FV?.markFieldValid(elements.customerName);
        }
        if (!phone) {
            isValid = FV ? FV.setFieldError(elements.customerPhone, 'Vui lòng nhập số điện thoại.') : false;
        } else if (!FV?.validateVietnamesePhone(phone)) {
            isValid = FV ? FV.setFieldError(elements.customerPhone, 'Số điện thoại không hợp lệ.') : false;
        } else {
            FV?.markFieldValid(elements.customerPhone);
        }
        if (!email) {
            isValid = FV ? FV.setFieldError(elements.customerEmail, 'Vui lòng nhập email.') : false;
        } else if (!FV?.validateEmail(email)) {
            isValid = FV ? FV.setFieldError(elements.customerEmail, 'Email không đúng định dạng.') : false;
        } else if (email) {
            FV?.markFieldValid(elements.customerEmail);
        } else {
            FV?.clearFieldError(elements.customerEmail);
        }
        if (!elements.customerRank.value) {
            isValid = FV ? FV.setFieldError(elements.customerRank, 'Vui lòng chọn hạng khách hàng.') : false;
        } else {
            FV?.markFieldValid(elements.customerRank);
        }
        if (!isValid) return;
        const payload = {
            id: id || `KH${Date.now().toString(36).toUpperCase()}`,
            fullName,
            phone,
            email,
            tier: elements.customerRank.value,
                visits: 0,
                totalSpent: 0
            };
            try {
                if (id) {
                    await request(`${CUSTOMERS_API_URL}/${encodeURIComponent(id)}`, {
                        method: 'PUT', body: JSON.stringify({ ...payload, id })
                    });
                    showToast('Đã cập nhật khách hàng!');
                } else {
                    await request(CUSTOMERS_API_URL, { method: 'POST', body: JSON.stringify(payload) });
                    showToast('Đã thêm khách hàng!');
                }
            } catch (err) { showToast(err.message, 'danger'); }
            bootstrap.Modal.getInstance(document.getElementById('addCustomerModal'))?.hide();
            elements.customerForm.reset();
            elements.customerId.value = '';
            await loadCustomers();
        });
        elements.confirmDeleteBtn?.addEventListener('click', async () => {
            if (!state.customerToDeleteId) return;
            try { await request(`${CUSTOMERS_API_URL}/${encodeURIComponent(state.customerToDeleteId)}`, { method: 'DELETE' }); } catch (_) {}
            state.customers = state.customers.filter(c => String(c.id) !== String(state.customerToDeleteId));
            localStorage.setItem('bistro_customers', JSON.stringify(state.customers));
            state.customerToDeleteId = null;
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
            updateStats();
            renderCustomers();
            showToast('Đã xóa khách hàng!');
        });
    }
    renderSelectOptions(elements.rankFilter, RANK_FILTER_OPTIONS, 'Tất cả');
    renderSelectOptions(elements.sortOption, SORT_OPTIONS, 'spend-desc');
    renderSelectOptions(elements.customerRank, FORM_RANK_OPTIONS, 'new');
    FV?.enableInstantClear(elements.customerForm);
    bindEvents();
    loadCustomers();
});
