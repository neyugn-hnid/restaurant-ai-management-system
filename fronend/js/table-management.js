document.addEventListener('DOMContentLoaded', () => {
    const TABLES_API_URL = 'http://localhost:7071/api/RestaurantTables';
    const ALL_OPTION = 'Tất cả';
    const DEFAULT_ZONE = 'Tầng 1';
    const DEFAULT_SORT = 'name-asc';
    const ITEMS_PER_PAGE = 10;
    const RELOAD_DELAY_MS = 250;
    const STORAGE_KEYS = {
        orders: 'bistro_orders',
        tableStatuses: 'bistro_table_statuses',
        tables: 'bistro_tables'
    };
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
    const EMPTY_PAGED_RESPONSE = {
        items: [],
        pageNumber: 1,
        pageSize: ITEMS_PER_PAGE,
        totalItemCount: 0,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false
    };

    const elements = {
        searchInput: document.getElementById('tableSearchMgmt'),
        locationFilter: document.getElementById('locationFilterMgmt'),
        statusFilter: document.getElementById('statusFilterMgmt'),
        sortFilter: document.getElementById('sortOptionMgmt'),
        tableBody: document.getElementById('tableManagementBody'),
        emptyStateRow: document.getElementById('emptyStateTableMgmt'),
        pagination: document.getElementById('tableManagementPagination'),
        info: document.getElementById('tableManagementInfo'),
        editModalElement: document.getElementById('editTableModal'),
        editForm: document.getElementById('editTableForm'),
        deleteModalElement: document.getElementById('deleteConfirmModal'),
        deleteConfirmButton: document.getElementById('confirmDeleteBtn'),
        qrModal: document.getElementById('qrModal'),
        toast: document.getElementById('liveToast'),
        toastMessage: document.getElementById('toastMessage')
    };

    const editModal = elements.editModalElement ? new bootstrap.Modal(elements.editModalElement) : null;
    const deleteModal = elements.deleteModalElement ? new bootstrap.Modal(elements.deleteModalElement) : null;

    const state = {
        tables: [],
        pagination: { ...EMPTY_PAGED_RESPONSE },
        currentPage: 1,
        editingTableId: null,
        deletingTableId: null,
        reloadTimeoutId: null
    };

    function readJson(key, fallback) {
        return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getOrders() {
        return readJson(STORAGE_KEYS.orders, []);
    }

    function getLocalStatuses() {
        return readJson(STORAGE_KEYS.tableStatuses, {});
    }

    function saveLocalStatus(tableId, status) {
        const statuses = getLocalStatuses();
        statuses[tableId] = status;
        writeJson(STORAGE_KEYS.tableStatuses, statuses);
    }

    function removeLocalStatus(tableId) {
        const statuses = getLocalStatuses();
        delete statuses[tableId];
        writeJson(STORAGE_KEYS.tableStatuses, statuses);
    }

    function persistTables() {
        writeJson(STORAGE_KEYS.tables, state.tables);
    }

    function showToast(message, type = 'success') {
        if (!elements.toast || !elements.toastMessage) {
            alert(message);
            return;
        }

        const icon = elements.toast.querySelector('.material-symbols-outlined');
        elements.toastMessage.textContent = message;

        if (type === 'danger') {
            elements.toast.className = 'toast align-items-center text-white bg-danger border-0';
            if (icon) icon.textContent = 'error';
        } else if (type === 'warning') {
            elements.toast.className = 'toast align-items-center text-dark bg-warning border-0';
            if (icon) icon.textContent = 'warning';
        } else {
            elements.toast.className = 'toast align-items-center text-white bg-success border-0';
            if (icon) icon.textContent = 'check_circle';
        }

        new bootstrap.Toast(elements.toast, { delay: 3000 }).show();
    }

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
            } catch (_) {
                // Ignore parse errors.
            }

            throw new Error(message);
        }

        if (response.status === 204) return null;
        return response.json();
    }

    function renderSelectOptions(selectElement, options, selectedValue) {
        if (!selectElement) return;

        selectElement.innerHTML = options
            .map(option => `<option value="${option.value}">${option.label}</option>`)
            .join('');

        if (selectedValue && options.some(option => option.value === selectedValue)) {
            selectElement.value = selectedValue;
        }
    }

    function normalizeStatus(status) {
        const value = String(status || '').trim().toLowerCase();

        if (value === TABLE_STATUSES.OCCUPIED.toLowerCase() || value === 'occupied') return TABLE_STATUSES.OCCUPIED;
        if (value === TABLE_STATUSES.RESERVED.toLowerCase() || value === 'reserved') return TABLE_STATUSES.RESERVED;
        if (value === TABLE_STATUSES.CLEANING.toLowerCase() || value === 'cleaning' || value === 'maintenance') {
            return TABLE_STATUSES.CLEANING;
        }

        return TABLE_STATUSES.AVAILABLE;
    }

    function getDisplayStatus(table) {
        const activeOrder = getOrders().find(order =>
            (order.customer === table.id || order.table_id === table.id || order.tableId === table.id) &&
            order.status !== 'Hoàn thành' &&
            order.status !== 'Hủy'
        );

        if (activeOrder) return TABLE_STATUSES.OCCUPIED;

        const localStatus = getLocalStatuses()[table.id];
        return normalizeStatus(localStatus || table.status);
    }

    function getStatusBadge(status) {
        const normalizedStatus = normalizeStatus(status);

        if (normalizedStatus === TABLE_STATUSES.OCCUPIED) {
            return '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger px-2 py-1 rounded-pill">Đang phục vụ</span>';
        }

        if (normalizedStatus === TABLE_STATUSES.RESERVED) {
            return '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning px-2 py-1 rounded-pill">Đã đặt</span>';
        }

        if (normalizedStatus === TABLE_STATUSES.CLEANING) {
            return '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary px-2 py-1 rounded-pill">Chờ dọn dẹp</span>';
        }

        return '<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1 rounded-pill">Trống</span>';
    }

    function getSelectedLocation() {
        return elements.locationFilter?.value || ALL_OPTION;
    }

    function getSelectedStatus() {
        return elements.statusFilter?.value || ALL_OPTION;
    }

    function getSelectedSort() {
        return elements.sortFilter?.value || DEFAULT_SORT;
    }

    function getSearchTerm() {
        return elements.searchInput?.value.trim() || '';
    }

    function mapSortOption(sortValue) {
        if (sortValue === 'name-desc') return { sortBy: 'id', sortOrder: 'desc' };
        if (sortValue === 'cap-asc') return { sortBy: 'capacity', sortOrder: 'asc' };
        if (sortValue === 'cap-desc') return { sortBy: 'capacity', sortOrder: 'desc' };
        return { sortBy: 'id', sortOrder: 'asc' };
    }

    function mapStatusFilter(status) {
        if (status === TABLE_STATUSES.OCCUPIED) return 'occupied';
        if (status === TABLE_STATUSES.RESERVED) return 'reserved';
        if (status === TABLE_STATUSES.CLEANING) return 'cleaning';
        if (status === TABLE_STATUSES.AVAILABLE) return 'available';
        return '';
    }

    function buildQueryString() {
        const { sortBy, sortOrder } = mapSortOption(getSelectedSort());
        const params = new URLSearchParams({
            page: String(state.currentPage),
            pageSize: String(ITEMS_PER_PAGE),
            sortBy,
            sortOrder
        });
        const searchTerm = getSearchTerm();
        const selectedLocation = getSelectedLocation();
        const mappedStatus = mapStatusFilter(getSelectedStatus());

        if (searchTerm) params.set('searchTerm', searchTerm);
        if (selectedLocation !== ALL_OPTION) params.set('location', selectedLocation);
        if (mappedStatus) params.set('status', mappedStatus);

        return params.toString();
    }

    function buildLocationOptions() {
        const locations = [...new Set(state.tables.map(table => table.zone).filter(Boolean))];

        return [
            { value: ALL_OPTION, label: 'Tất cả khu vực' },
            ...locations.map(location => ({ value: location, label: location }))
        ];
    }

    function updateFilterOptions() {
        renderSelectOptions(elements.locationFilter, buildLocationOptions(), getSelectedLocation());
        renderSelectOptions(elements.statusFilter, STATUS_FILTER_OPTIONS, getSelectedStatus());
        renderSelectOptions(elements.sortFilter, SORT_OPTIONS, getSelectedSort());
    }

    function renderPagination() {
        if (!elements.pagination) return;

        const totalPages = Math.max(1, state.pagination.pageCount || 1);
        let markup = `
            <li class="page-item ${state.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="prev">Trước</a>
            </li>
        `;

        for (let page = 1; page <= totalPages; page += 1) {
            const activeClasses = page === state.currentPage ? 'bg-primary text-white' : 'text-secondary bg-light';
            markup += `
                <li class="page-item ${page === state.currentPage ? 'active' : ''}">
                    <a class="page-link rounded-pill border-0 ${activeClasses} px-3" href="#" data-page="${page}">${page}</a>
                </li>
            `;
        }

        markup += `
            <li class="page-item ${state.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="next">Sau</a>
            </li>
        `;

        elements.pagination.innerHTML = markup;
    }

    function renderTableRows() {
        if (!elements.tableBody || !elements.emptyStateRow) return;

        const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
        elements.tableBody.querySelectorAll('tr[data-table-id]').forEach(row => row.remove());

        state.tables.forEach((table, index) => {
            const displayStatus = getDisplayStatus(table);
            const row = document.createElement('tr');

            row.dataset.tableId = table.id;
            row.dataset.status = displayStatus;
            row.innerHTML = `
                <td class="fw-medium text-dark">#${String(startIndex + index + 1).padStart(2, '0')}</td>
                <td><span class="fw-semibold text-dark">${table.id}</span></td>
                <td>${table.zone || 'Khu chung'}</td>
                <td>
                    <span class="d-inline-flex align-items-center gap-1 text-secondary">
                        <span class="material-symbols-outlined fs-6">group</span> ${Number(table.capacity || 0)} khách
                    </span>
                </td>
                <td>${getStatusBadge(displayStatus)}</td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center qr-btn-mgmt" style="width: 32px; height: 32px; border-radius: 50%; color: var(--text-soft) !important; background-color: #fff !important;" title="Mã QR" data-bs-toggle="modal" data-bs-target="#qrModal" data-table-id="${table.id}">
                            <span class="material-symbols-outlined fs-6">qr_code_2</span>
                        </button>
                        <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center edit-table-btn" style="width: 32px; height: 32px; border-radius: 50%; color: var(--text-soft) !important; background-color: #fff !important;" title="Sửa" data-bs-toggle="modal" data-bs-target="#editTableModal" data-table-mode="edit" data-table-id="${table.id}">
                            <span class="material-symbols-outlined fs-6">edit</span>
                        </button>
                        <button class="btn btn-light btn-icon border border-danger shadow-sm p-0 d-flex align-items-center justify-content-center text-danger delete-table-btn" style="width: 32px; height: 32px; border-radius: 50%; color: #dc3545 !important; background-color: #fff !important;" title="Xóa" data-table-id="${table.id}">
                            <span class="material-symbols-outlined fs-6">delete</span>
                        </button>
                    </div>
                </td>
            `;

            elements.tableBody.appendChild(row);
        });

        elements.emptyStateRow.style.display = state.tables.length === 0 ? '' : 'none';

        if (elements.info) {
            if (state.pagination.totalItemCount === 0) {
                elements.info.textContent = 'Không có bàn nào phù hợp';
            } else {
                const fromItem = ((state.pagination.pageNumber || 1) - 1) * (state.pagination.pageSize || ITEMS_PER_PAGE) + 1;
                const toItem = Math.min(fromItem + state.tables.length - 1, state.pagination.totalItemCount);
                elements.info.textContent = `Hiển thị ${fromItem}-${toItem} của ${state.pagination.totalItemCount} bàn`;
            }
        }

        renderPagination();
    }

    function refreshView() {
        updateFilterOptions();
        renderTableRows();
        persistTables();
    }

    function fillForm(table) {
        const locationField = document.getElementById('editTableLocation');

        if (table?.zone && locationField && ![...locationField.options].some(option => option.value === table.zone)) {
            locationField.insertAdjacentHTML('beforeend', `<option value="${table.zone}">${table.zone}</option>`);
        }

        document.getElementById('editTableName').value = table?.id || '';
        document.getElementById('editTableLocation').value = table?.zone || DEFAULT_ZONE;
        document.getElementById('editTableCapacity').value = table?.capacity || '';
        document.getElementById('editTableStatus').value = normalizeStatus(table?.status || TABLE_STATUSES.AVAILABLE);
    }

    function buildCustomerMenuUrl(tableId) {
        const relativeUrl = `/customer-menu.html?table=${encodeURIComponent(tableId)}`;
        return window.location.protocol.startsWith('http')
            ? `${window.location.origin}${relativeUrl}`
            : `http://localhost:5500${relativeUrl}`;
    }

    function setQrContent(tableId) {
        if (!elements.qrModal) return;

        const targetUrl = `/customer-menu.html?table=${encodeURIComponent(tableId)}`;
        const absoluteUrl = buildCustomerMenuUrl(tableId);
        const nameElement = elements.qrModal.querySelector('.qr-table-name');
        const qrImage = elements.qrModal.querySelector('img');
        const testLink = elements.qrModal.querySelector('#qrTestLinkMgmt');
        const directLink = elements.qrModal.querySelector('#qrDirectLink2');

        if (nameElement) nameElement.textContent = tableId;
        if (testLink) testLink.href = targetUrl;
        if (directLink) directLink.href = targetUrl;
        if (qrImage) {
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(absoluteUrl)}`;
        }
    }

    function findTableById(tableId) {
        return state.tables.find(table => table.id === tableId);
    }

    async function loadTables() {
        try {
            const response = await request(`${TABLES_API_URL}?${buildQueryString()}`);
            state.tables = Array.isArray(response?.items) ? response.items : [];
            state.pagination = response || { ...EMPTY_PAGED_RESPONSE };
            refreshView();
        } catch (error) {
            console.error('Không tải được danh sách bàn:', error);
            state.tables = [];
            state.pagination = { ...EMPTY_PAGED_RESPONSE };
            refreshView();
            showToast(`Không tải được dữ liệu bàn: ${error.message}`, 'danger');
        }
    }

    function scheduleReload(resetPage = false) {
        if (resetPage) state.currentPage = 1;

        if (state.reloadTimeoutId) {
            window.clearTimeout(state.reloadTimeoutId);
        }

        state.reloadTimeoutId = window.setTimeout(loadTables, RELOAD_DELAY_MS);
    }

    async function createTable(payload) {
        await request(TABLES_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        saveLocalStatus(payload.id, normalizeStatus(payload.status));
        await loadTables();
    }

    async function updateTable(originalId, payload) {
        if (originalId !== payload.id) {
            await createTable(payload);
            await deleteTable(originalId);
            return;
        }

        await request(`${TABLES_API_URL}/${encodeURIComponent(originalId)}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        saveLocalStatus(payload.id, normalizeStatus(payload.status));
        await loadTables();
    }

    async function deleteTable(tableId) {
        await request(`${TABLES_API_URL}/${encodeURIComponent(tableId)}`, {
            method: 'DELETE'
        });

        removeLocalStatus(tableId);
        await loadTables();
    }

    function handlePaginationClick(event) {
        const link = event.target.closest('[data-page]');
        if (!link) return;

        event.preventDefault();

        if (link.dataset.page === 'prev' && state.currentPage > 1) {
            state.currentPage -= 1;
        } else if (link.dataset.page === 'next' && state.currentPage < Math.max(1, state.pagination.pageCount || 1)) {
            state.currentPage += 1;
        } else if (!Number.isNaN(Number(link.dataset.page))) {
            state.currentPage = Number(link.dataset.page);
        }

        loadTables();
    }

    function handleDocumentClick(event) {
        const qrButton = event.target.closest('.qr-btn-mgmt');
        const deleteButton = event.target.closest('.delete-table-btn');

        if (qrButton) {
            setQrContent(qrButton.dataset.tableId || '');
            return;
        }

        if (deleteButton) {
            state.deletingTableId = deleteButton.dataset.tableId || null;
            if (state.deletingTableId && deleteModal) {
                deleteModal.show();
            }
        }
    }

    function handleEditModalShow(event) {
        const trigger = event.relatedTarget;
        const mode = trigger?.dataset?.tableMode || 'create';

        if (mode === 'edit') {
            state.editingTableId = trigger.dataset.tableId || null;
            fillForm(findTableById(state.editingTableId));
            document.getElementById('editTableModalLabel').textContent = 'Cập nhật bàn';
            return;
        }

        state.editingTableId = null;
        fillForm(null);
        document.getElementById('editTableModalLabel').textContent = 'Thêm bàn mới';
    }

    async function handleEditFormSubmit(event) {
        event.preventDefault();

        const name = document.getElementById('editTableName').value.trim();
        const zone = document.getElementById('editTableLocation').value;
        const capacity = Number(document.getElementById('editTableCapacity').value);
        const status = document.getElementById('editTableStatus').value;

        if (!name || !zone || !capacity) {
            showToast('Vui lòng nhập đầy đủ thông tin bàn.', 'warning');
            return;
        }

        if (!state.editingTableId && findTableById(name)) {
            showToast('Mã bàn đã tồn tại.', 'warning');
            return;
        }

        if (state.editingTableId && name !== state.editingTableId && findTableById(name)) {
            showToast('Tên bàn mới đã tồn tại.', 'warning');
            return;
        }

        const currentTable = state.editingTableId ? findTableById(state.editingTableId) : null;
        const payload = {
            id: name,
            zone,
            capacity,
            status: normalizeStatus(status),
            createdAt: currentTable?.createdAt || currentTable?.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            if (state.editingTableId) {
                await updateTable(state.editingTableId, payload);
                showToast(`Đã cập nhật ${name}`);
            } else {
                await createTable(payload);
                showToast(`Đã thêm ${name}`);
            }

            editModal?.hide();
            elements.editForm?.reset();
        } catch (error) {
            console.error('Không lưu được bàn:', error);
            showToast(`Không thể lưu bàn: ${error.message}`, 'danger');
        }
    }

    async function handleDeleteConfirm() {
        if (!state.deletingTableId) return;

        try {
            await deleteTable(state.deletingTableId);
            deleteModal?.hide();
            showToast(`Đã xóa ${state.deletingTableId}`);
            state.deletingTableId = null;
        } catch (error) {
            console.error('Không xóa được bàn:', error);
            showToast(`Không thể xóa bàn: ${error.message}`, 'danger');
        }
    }

    function bindEvents() {
        elements.searchInput?.addEventListener('input', () => scheduleReload(true));
        elements.locationFilter?.addEventListener('change', () => scheduleReload(true));
        elements.statusFilter?.addEventListener('change', () => scheduleReload(true));
        elements.sortFilter?.addEventListener('change', () => scheduleReload(true));
        elements.pagination?.addEventListener('click', handlePaginationClick);
        elements.editModalElement?.addEventListener('show.bs.modal', handleEditModalShow);
        elements.editForm?.addEventListener('submit', handleEditFormSubmit);
        elements.deleteConfirmButton?.addEventListener('click', handleDeleteConfirm);
        document.addEventListener('click', handleDocumentClick);

        window.addEventListener('storage', event => {
            if (event.key === STORAGE_KEYS.orders || event.key === STORAGE_KEYS.tableStatuses) {
                renderTableRows();
            }
        });

        window.addEventListener('pageshow', event => {
            if (event.persisted) {
                renderTableRows();
            }
        });
    }

    bindEvents();
    updateFilterOptions();
    loadTables();
});
