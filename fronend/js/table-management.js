document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://localhost:7071/api';
    const TABLES_URL = `${API_BASE}/RestaurantTables`;
    const ALL_OPTION = 'Tất cả';
    const ITEMS_PER_PAGE = 10;

    const TABLE_STATUSES = {
        AVAILABLE: 'Trống',
        OCCUPIED: 'Đang phục vụ',
        RESERVED: 'Đã đặt',
        CLEANING: 'Chờ dọn dẹp'
    };

    const STATUS_FILTER_OPTIONS = [
        { value: ALL_OPTION, label: 'Tất cả trạng thái' },
        { value: TABLE_STATUSES.AVAILABLE, label: TABLE_STATUSES.AVAILABLE },
        { value: TABLE_STATUSES.OCCUPIED, label: TABLE_STATUSES.OCCUPIED },
        { value: TABLE_STATUSES.RESERVED, label: TABLE_STATUSES.RESERVED },
        { value: TABLE_STATUSES.CLEANING, label: TABLE_STATUSES.CLEANING }
    ];

    const SORT_OPTIONS = [
        { value: 'name-asc', label: 'Tên (A-Z)' },
        { value: 'name-desc', label: 'Tên (Z-A)' },
        { value: 'cap-asc', label: 'Sức chứa (Tăng dần)' },
        { value: 'cap-desc', label: 'Sức chứa (Giảm dần)' }
    ];

    const FORM_STATUS_OPTIONS = [
        { value: TABLE_STATUSES.AVAILABLE, label: TABLE_STATUSES.AVAILABLE },
        { value: TABLE_STATUSES.OCCUPIED, label: TABLE_STATUSES.OCCUPIED },
        { value: TABLE_STATUSES.RESERVED, label: TABLE_STATUSES.RESERVED },
        { value: TABLE_STATUSES.CLEANING, label: TABLE_STATUSES.CLEANING }
    ];

    const elements = {
        searchInput: document.getElementById('tableSearchMgmt'),
        locationFilter: document.getElementById('locationFilterMgmt'),
        statusFilter: document.getElementById('statusFilterMgmt'),
        sortFilter: document.getElementById('sortOptionMgmt'),
        tableBody: document.getElementById('tableManagementBody'),
        pagination: document.getElementById('tableManagementPagination'),
        info: document.getElementById('tableManagementInfo'),
        editForm: document.getElementById('editTableForm'),
        editTableName: document.getElementById('editTableName'),
        editTableLocation: document.getElementById('editTableLocation'),
        editTableCapacity: document.getElementById('editTableCapacity'),
        editTableStatus: document.getElementById('editTableStatus'),
        editModalLabel: document.getElementById('editTableModalLabel'),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
        toast: document.getElementById('liveToast'),
        toastMessage: document.getElementById('toastMessage')
    };

    const state = {
        tables: [],
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        searchTerm: '',
        locationFilter: ALL_OPTION,
        statusFilter: ALL_OPTION,
        sort: 'name-asc',
        tableToDeleteId: null
    };

    function renderSelectOptions(selectEl, options, selectedValue) {
        if (!selectEl) return;
        selectEl.innerHTML = options
            .map(o => `<option value="${o.value}"${o.value === selectedValue ? ' selected' : ''}>${o.label}</option>`)
            .join('');
    }

    async function apiFetch(url, options = {}) {
        const resp = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        if (!resp.ok) throw new Error(`API ${resp.status}`);
        if (resp.status === 204) return null;
        return resp.json();
    }

    function showToast(message, type = 'success') {
        if (!elements.toast || !elements.toastMessage) { alert(message); return; }
        elements.toastMessage.textContent = message;
        elements.toast.className = `toast align-items-center text-white bg-${type} border-0`;
        new bootstrap.Toast(elements.toast, { delay: 3000 }).show();
    }

    function getStatusBadge(status) {
        const config = {
            [TABLE_STATUSES.AVAILABLE]: 'bg-success bg-opacity-10 text-success',
            [TABLE_STATUSES.OCCUPIED]: 'bg-danger bg-opacity-10 text-danger',
            [TABLE_STATUSES.RESERVED]: 'bg-warning bg-opacity-10 text-warning',
            [TABLE_STATUSES.CLEANING]: 'bg-info bg-opacity-10 text-info'
        };
        const cls = config[status] || 'bg-secondary bg-opacity-10 text-secondary';
        return `<span class="badge ${cls}">${status || 'N/A'}</span>`;
    }

    async function loadTables() {
        if (!elements.tableBody) return;
        elements.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span> Đang tải...</td></tr>';

        try {
            const sortParts = state.sort.split('-');
            const query = new URLSearchParams({
                page: state.currentPage,
                pageSize: ITEMS_PER_PAGE,
                searchTerm: state.searchTerm,
                sortBy: sortParts[0] === 'name' ? 'id' : sortParts[0],
                sortOrder: sortParts[1] || 'asc'
            });
            if (state.locationFilter !== ALL_OPTION) query.set('location', state.locationFilter);
            if (state.statusFilter !== ALL_OPTION) query.set('status', state.statusFilter);

            const resp = await apiFetch(`${TABLES_URL}?${query}`);
            state.tables = resp?.items || [];
            state.totalItems = resp?.totalItemCount || state.tables.length;
            state.totalPages = Math.ceil(state.totalItems / ITEMS_PER_PAGE) || 1;
            localStorage.setItem('bistro_tables', JSON.stringify(state.tables));

            updateLocationFilter();
        } catch (err) {
            console.warn('API không khả dụng:', err.message);
            state.tables = JSON.parse(localStorage.getItem('bistro_tables') || '[]');
            state.totalItems = state.tables.length;
            state.totalPages = Math.ceil(state.totalItems / ITEMS_PER_PAGE) || 1;
            updateLocationFilter();
        }
        renderTables();
    }

    function updateLocationFilter() {
        const locations = [...new Set(state.tables.map(t => t.zone).filter(Boolean))];
        const currentVal = elements.locationFilter?.value || ALL_OPTION;
        const options = [
            { value: ALL_OPTION, label: 'Tất cả khu vực' },
            ...locations.map(l => ({ value: l, label: l }))
        ];
        renderSelectOptions(elements.locationFilter, options, currentVal);
    }

    function getFilteredTables() {
        return state.tables.filter(t => {
            if (state.locationFilter !== ALL_OPTION && t.zone !== state.locationFilter) return false;
            if (state.statusFilter !== ALL_OPTION && t.status !== state.statusFilter) return false;
            if (state.searchTerm) {
                const s = state.searchTerm.toLowerCase();
                return (t.id || '').toLowerCase().includes(s) || (t.zone || '').toLowerCase().includes(s);
            }
            return true;
        });
    }

    function renderTables() {
        if (!elements.tableBody) return;
        const filtered = getFilteredTables();
        const start = (state.currentPage - 1) * ITEMS_PER_PAGE;
        const pageData = filtered.slice(start, start + ITEMS_PER_PAGE);

        if (elements.info) {
            elements.info.textContent = '';
        }

        if (pageData.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Không tìm thấy bàn nào.</td></tr>';
            renderPagination(filtered);
            return;
        }

        elements.tableBody.innerHTML = pageData.map(t => `
            <tr>
                <td class="ps-3 fw-semibold">${t.id || '-'}</td>
                <td>${t.zone || '-'}</td>
                <td>${t.capacity || 0} người</td>
                <td>${getStatusBadge(t.status)}</td>
                <td class="small text-muted">${t.updatedAt ? new Date(t.updatedAt).toLocaleDateString('vi-VN') : '-'}</td>
                <td class="text-end pe-3">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center edit-btn" data-id="${t.id}" style="width:32px;height:32px;border-radius:50%;color:var(--text-soft) !important;background-color:#fff !important;" title="Sửa">
                            <span class="material-symbols-outlined icon-sm">edit</span>
                        </button>
                        <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center delete-btn" data-id="${t.id}" style="width:32px;height:32px;border-radius:50%;color:#dc3545 !important;background-color:#fff !important;" title="Xóa">
                            <span class="material-symbols-outlined icon-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>`).join('');

        bindRowButtons();
        renderPagination(filtered);
    }

    function bindRowButtons() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const t = state.tables.find(x => String(x.id) === String(btn.dataset.id));
                if (!t) return;

                elements.editModalLabel.textContent = 'Sửa thông tin Bàn';
                elements.editTableName.value = t.id || '';
                elements.editTableCapacity.value = t.capacity || 4;
                renderSelectOptions(elements.editTableLocation, getLocationOptions(), t.zone || '');
                renderSelectOptions(elements.editTableStatus, FORM_STATUS_OPTIONS, t.status || TABLE_STATUSES.AVAILABLE);

                elements.editForm.dataset.editId = t.id;
                new bootstrap.Modal(document.getElementById('editTableModal')).show();
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.tableToDeleteId = btn.dataset.id;
                new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
            });
        });
    }

    function getLocationOptions() {
        const locations = [...new Set(state.tables.map(t => t.zone).filter(Boolean))];
        return locations.map(l => ({ value: l, label: l }));
    }

    function renderPagination(filtered) {
        if (!elements.pagination) return;
        const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
        elements.pagination.innerHTML = '';

        const addBtn = (label, page, disabled) => {
            const li = document.createElement('li');
            li.className = `page-item${disabled ? ' disabled' : ''}`;
            li.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="${page}">${label}</a>`;
            elements.pagination.appendChild(li);
        };

        addBtn('Trước', 'prev', state.currentPage === 1);
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item${state.currentPage === i ? ' active' : ''}`;
            const cls = state.currentPage === i ? 'bg-primary text-white' : 'text-secondary bg-light';
            li.innerHTML = `<a class="page-link rounded-pill border-0 ${cls} px-3" href="#" data-page="${i}">${i}</a>`;
            elements.pagination.appendChild(li);
        }
        addBtn('Sau', 'next', state.currentPage === totalPages);

        elements.pagination.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                const page = a.dataset.page;
                if (page === 'prev' && state.currentPage > 1) state.currentPage--;
                else if (page === 'next' && state.currentPage < totalPages) state.currentPage++;
                else if (page !== 'prev' && page !== 'next') state.currentPage = parseInt(page, 10);
                renderTables();
            });
        });
    }

    function applyFilters() {
        state.searchTerm = elements.searchInput?.value?.trim() || '';
        state.locationFilter = elements.locationFilter?.value || ALL_OPTION;
        state.statusFilter = elements.statusFilter?.value || ALL_OPTION;
        state.sort = elements.sortFilter?.value || 'name-asc';
        state.currentPage = 1;
        loadTables();
    }

    function bindEvents() {
        elements.searchInput?.addEventListener('input', () => {
            state.searchTerm = elements.searchInput.value.trim();
            state.currentPage = 1;
            renderTables();
        });
        elements.locationFilter?.addEventListener('change', applyFilters);
        elements.statusFilter?.addEventListener('change', applyFilters);
        elements.sortFilter?.addEventListener('change', applyFilters);

        elements.editForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editId = elements.editForm.dataset.editId;

            const payload = {
                id: elements.editTableName.value.trim(),
                zone: elements.editTableLocation.value,
                capacity: parseInt(elements.editTableCapacity.value) || 4,
                status: elements.editTableStatus.value,
                updatedAt: new Date().toISOString()
            };

            try {
                if (editId) {
                    const table = state.tables.find(t => String(t.id) === String(editId));
                    await apiFetch(`${TABLES_URL}/${encodeURIComponent(editId)}`, {
                        method: 'PUT', body: JSON.stringify({ ...table, ...payload })
                    });
                    showToast('Đã cập nhật bàn!');
                } else {
                    await apiFetch(TABLES_URL, { method: 'POST', body: JSON.stringify({ ...payload, createdAt: new Date().toISOString() }) });
                    showToast('Đã thêm bàn mới!');
                }
            } catch (err) { showToast(err.message, 'danger'); }

            bootstrap.Modal.getInstance(document.getElementById('editTableModal'))?.hide();
            await loadTables();
        });

        elements.confirmDeleteBtn?.addEventListener('click', async () => {
            if (!state.tableToDeleteId) return;
            try {
                await apiFetch(`${TABLES_URL}/${encodeURIComponent(state.tableToDeleteId)}`, { method: 'DELETE' });
                showToast('Đã xóa bàn!');
            } catch (err) { showToast(err.message, 'danger'); }
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
            state.tableToDeleteId = null;
            await loadTables();
        });

        document.getElementById('btnOpenAddModal')?.addEventListener('click', () => {
            elements.editModalLabel.textContent = 'Thêm Bàn Mới';
            elements.editForm.reset();
            elements.editForm.dataset.editId = '';
            elements.editTableName.value = '';
            elements.editTableCapacity.value = '4';
            renderSelectOptions(elements.editTableLocation, getLocationOptions(), '');
            renderSelectOptions(elements.editTableStatus, FORM_STATUS_OPTIONS, TABLE_STATUSES.AVAILABLE);
        });
    }

    renderSelectOptions(elements.statusFilter, STATUS_FILTER_OPTIONS, ALL_OPTION);
    renderSelectOptions(elements.sortFilter, SORT_OPTIONS, 'name-asc');
    bindEvents();
    loadTables();
});
