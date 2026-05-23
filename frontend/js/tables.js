import {
    ORDER_STATUSES,
    TABLE_STATUSES,
    isCompletedOrderStatus
} from './status-constants.js';

document.addEventListener('DOMContentLoaded', () => {
    const TABLES_API_URL = 'http://localhost:7071/api/RestaurantTables';
    const ALL_OPTION = 'Tất cả';
    const DEFAULT_LOCATION = 'Khu chung';
    const DEFAULT_SORT = 'name-asc';
    const LIST_PAGE_SIZE = 100;
    const RELOAD_DELAY_MS = 250;
    const STORAGE_KEYS = {
        orders: 'bistro_orders',
        tables: 'bistro_tables'
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

    const elements = {
        locationFilter: document.getElementById('locationFilter'),
        statusFilter: document.getElementById('statusFilter'),
        sortFilter: document.getElementById('sortOption'),
        searchInput: document.getElementById('tableSearch'),
        tableList: document.getElementById('tableList'),
        emptyState: document.getElementById('emptyState'),
        addTableForm: document.getElementById('addTableForm'),
        toast: document.getElementById('liveToast'),
        toastMessage: document.getElementById('toastMessage'),
        addTableModal: document.getElementById('addTableModal'),
        detailModal: document.getElementById('tableDetailModal')
    };

    const state = {
        tables: [],
        tableItems: [],
        backendReady: false,
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

    // Local overrides for table statuses are intentionally removed to
    // ensure the backend is the single source of truth for table state.

    function persistTables() {
        // Không lưu vào localStorage - backend là nguồn dữ liệu duy nhất
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

        new bootstrap.Toast(elements.toast, { delay: 4000 }).show();
    }

    function ensureBackendReady() {
        if (state.backendReady) return true;
        showToast(`Backend chưa sẵn sàng. Kiểm tra API: ${TABLES_API_URL}`, 'danger');
        return false;
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

        if (value === TABLE_STATUSES.AVAILABLE.toLowerCase() || value === 'ready') return TABLE_STATUSES.AVAILABLE;
        if (value === TABLE_STATUSES.OCCUPIED.toLowerCase() || value === 'occupied') return TABLE_STATUSES.OCCUPIED;
        if (value === TABLE_STATUSES.RESERVED.toLowerCase() || value === 'reserved') return TABLE_STATUSES.RESERVED;
        if (value === TABLE_STATUSES.CLEANING.toLowerCase() || value === 'maintenance' || value === 'cleaning') {
            return TABLE_STATUSES.CLEANING;
        }

        return TABLE_STATUSES.AVAILABLE;
    }

    function getStatusConfig(status) {
        const normalizedStatus = normalizeStatus(status);

        if (normalizedStatus === TABLE_STATUSES.OCCUPIED) {
            return {
                className: 'table-occupied',
                cardStyle: 'background-color: #fffbfa; border-color: rgba(186,26,26,0.2);',
                badgeStyle: 'background-color: rgba(186, 26, 26, 0.1); color: #ba1a1a;'
            };
        }

        if (normalizedStatus === TABLE_STATUSES.RESERVED) {
            return {
                className: 'table-reserved',
                cardStyle: 'background-color: #fffaf5; border-color: rgba(253,118,26,0.2);',
                badgeStyle: 'background-color: rgba(253, 118, 26, 0.1); color: #fd761a;'
            };
        }

        if (normalizedStatus === TABLE_STATUSES.CLEANING) {
            return {
                className: 'table-cleaning',
                cardStyle: 'background-color: #fdf6ec; border-color: rgba(249,115,22,0.2);',
                badgeStyle: 'background-color: rgba(249, 115, 22, 0.1); color: #f97316;'
            };
        }

        return {
            className: 'table-free',
            cardStyle: '',
            badgeStyle: 'background-color: rgba(39, 195, 138, 0.1); color: #27c38a;'
        };
    }

    function getActiveOrder(tableId) {
        return getOrders().find(order =>
            (order.customer === tableId || String(order.table_id) === String(tableId) || String(order.tableId) === String(tableId)) &&
            !isCompletedOrderStatus(order.status)
        );
    }

    function resolveDisplayStatus(table) {
        if (getActiveOrder(table.id)) return TABLE_STATUSES.OCCUPIED;
        return normalizeStatus(table.status);
    }

    function formatCurrency(value) {
        return `${new Intl.NumberFormat('vi-VN').format(value || 0)}đ`;
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

    function buildTablesQueryString() {
        const { sortBy, sortOrder } = mapSortOption(getSelectedSort());
        const params = new URLSearchParams({
            page: '1',
            pageSize: String(LIST_PAGE_SIZE),
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

    function sortTableItems(items) {
        const sortValue = getSelectedSort();

        return [...items].sort((left, right) => {
            const leftName = (left.dataset.tableId || '').trim();
            const rightName = (right.dataset.tableId || '').trim();
            const leftCapacity = Number(left.dataset.capacity || 0);
            const rightCapacity = Number(right.dataset.capacity || 0);

            if (sortValue === 'name-desc') return rightName.localeCompare(leftName, 'vi');
            if (sortValue === 'cap-asc') return leftCapacity - rightCapacity;
            if (sortValue === 'cap-desc') return rightCapacity - leftCapacity;
            return leftName.localeCompare(rightName, 'vi');
        });
    }

    function getFooterMarkup(table, displayStatus) {
        const activeOrder = getActiveOrder(table.id);

        if (displayStatus === TABLE_STATUSES.OCCUPIED) {
            return `
                <div class="border-top pt-3 d-flex justify-content-between align-items-center">
                    <span class="fw-bold text-dark">${formatCurrency(activeOrder?.total || 0)}</span>
                    <a href="#" class="text-primary text-decoration-none fw-medium small action-btn">Thanh toán</a>
                </div>
            `;
        }

        if (displayStatus === TABLE_STATUSES.RESERVED) {
            return `
                <div class="border-top pt-3 d-flex justify-content-end align-items-center">
                    <a href="#" class="text-primary text-decoration-none fw-medium small action-btn">Nhận bàn</a>
                </div>
            `;
        }

        if (displayStatus === TABLE_STATUSES.CLEANING) {
            return `
                <div class="border-top pt-3 d-flex justify-content-end align-items-center">
                    <a href="#" class="text-primary text-decoration-none fw-medium small action-btn">Đã dọn xong</a>
                </div>
            `;
        }

        return `
            <div class="border-top pt-3 d-flex justify-content-end align-items-center">
                <a href="#" class="text-primary text-decoration-none fw-medium small action-btn">Chi tiết</a>
            </div>
        `;
    }

    function createTableMarkup(table) {
        const displayStatus = resolveDisplayStatus(table);
        const statusConfig = getStatusConfig(displayStatus);

        return `
            <div class="col-sm-6 col-md-4 col-xl-3 table-item"
                 data-table-id="${table.id}"
                 data-zone="${table.zone || DEFAULT_LOCATION}"
                 data-capacity="${table.capacity || 0}"
                 data-status="${displayStatus}">
                <div class="card border-0 shadow-sm rounded-4 h-100 p-4 table-card ${statusConfig.className} position-relative overflow-hidden"
                     style="${statusConfig.cardStyle}">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="fw-bold mb-0 text-dark">${table.name || table.id}</h5>
                        <div class="d-flex flex-column align-items-end gap-1 mt-n1">
                            <span class="badge" style="${statusConfig.badgeStyle}">${displayStatus}</span>
                        </div>
                    </div>
                    <div class="text-secondary small mb-4 d-flex flex-column gap-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <span class="material-symbols-outlined" style="font-size: 1.1rem;">location_on</span>
                                <span class="location-text">${table.zone || DEFAULT_LOCATION}</span>
                            </div>
                            <button class="btn btn-sm border-0 p-0 text-secondary qr-btn d-flex align-items-center"
                                    title="Mã QR"
                                    data-bs-toggle="modal"
                                    data-bs-target="#qrModal"
                                    style="background: transparent;">
                                <span class="material-symbols-outlined" style="font-size: 1.2rem;">qr_code_2</span>
                            </button>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem;">group</span>
                            <span class="capacity-text">${table.capacity || 0} Người</span>
                        </div>
                    </div>
                    ${getFooterMarkup(table, displayStatus)}
                </div>
            </div>
        `;
    }

    function updateStats() {
        const statElements = document.querySelectorAll('.stat-card h2');
        if (statElements.length < 4) return;

        const displayStatuses = state.tables.map(resolveDisplayStatus);
        statElements[0].textContent = state.tables.length;
        statElements[1].textContent = displayStatuses.filter(status => status === TABLE_STATUSES.AVAILABLE).length;
        statElements[2].textContent = displayStatuses.filter(status => status === TABLE_STATUSES.OCCUPIED).length;
        statElements[3].textContent = displayStatuses.filter(status => status === TABLE_STATUSES.RESERVED).length;
    }

    function renderEmptyState(title, description) {
        state.tables = [];
        state.tableItems = [];
        updateStats();

        if (!elements.tableList || !elements.emptyState) return;

        elements.tableList.innerHTML = '';
        elements.tableList.appendChild(elements.emptyState);
        elements.emptyState.style.display = 'block';

        const titleElement = elements.emptyState.querySelector('h5');
        const descriptionElement = elements.emptyState.querySelector('p');

        if (titleElement) titleElement.textContent = title;
        if (descriptionElement) descriptionElement.textContent = description;
    }

    function renderTables() {
        if (!elements.tableList || !elements.emptyState) return;

        const html = state.tables.map(table => createTableMarkup(table)).join('');
        elements.tableList.innerHTML = html || '';
        elements.tableList.appendChild(elements.emptyState);

        state.tableItems = Array.from(elements.tableList.querySelectorAll('.table-item'));
        updateFilterOptions();
        updateStats();
        applyTableFilters();
    }

    function applyTableFilters() {
        if (!elements.emptyState) return;

        const selectedLocation = getSelectedLocation();
        const selectedStatus = getSelectedStatus();
        const searchTerm = getSearchTerm().toLowerCase();

        let visibleCount = 0;
        state.tableItems.forEach(item => {
            const zone = (item.dataset.zone || '').toLowerCase();
            const status = item.dataset.status || '';
            const tableId = (item.dataset.tableId || '').toLowerCase();

            const matchLocation = selectedLocation === ALL_OPTION || zone === selectedLocation.toLowerCase();
            const matchStatus = selectedStatus === ALL_OPTION || status === selectedStatus;
            const matchSearch = !searchTerm || tableId.includes(searchTerm) || zone.includes(searchTerm);

            if (matchLocation && matchStatus && matchSearch) {
                item.style.display = 'block';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        elements.emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
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
                const errorText = await response.text();
                if (errorText) message = errorText;
            } catch (_) {

            }

            throw new Error(message);
        }

        if (response.status === 204) return null;
        return response.json();
    }

    function findTableById(tableId) {
        return state.tables.find(table => String(table.id) === String(tableId));
    }

    async function updateTableOnServer(table, overrides) {
        const payload = {};

        if (overrides.status !== undefined) payload.status = normalizeStatus(overrides.status);
        if (overrides.zone !== undefined) payload.zone = overrides.zone;
        if (overrides.capacity !== undefined) payload.capacity = overrides.capacity;
        if (overrides.name !== undefined) payload.name = overrides.name;

        await request(`${TABLES_API_URL}/${encodeURIComponent(table.id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        return { ...table, ...overrides };
    }

    async function loadTables() {
        try {
            const response = await request(`${TABLES_API_URL}?${buildTablesQueryString()}`);
            state.tables = Array.isArray(response?.items) ? response.items : [];
            state.backendReady = true;
            persistTables();
            renderTables();
        } catch (error) {
            state.backendReady = false;
            console.error('Không tải được danh sách bàn từ backend:', error);
            showToast(`Không tải được dữ liệu bàn từ backend: ${error.message}`, 'danger');
            renderEmptyState('Không tải được dữ liệu từ backend', `${error.message} Kiểm tra API tại ${TABLES_API_URL}.`);
        }
    }

    function scheduleReloadTables() {
        if (state.reloadTimeoutId) {
            window.clearTimeout(state.reloadTimeoutId);
        }

        state.reloadTimeoutId = window.setTimeout(loadTables, RELOAD_DELAY_MS);
    }

    function buildCustomerMenuUrl(tableId) {
        const relativeUrl = `./customer-menu.html?table=${encodeURIComponent(tableId)}`;
        return window.location.protocol.startsWith('http')
            ? `${window.location.origin}${relativeUrl}`
            : `http://localhost:5500${relativeUrl}`;
    }

    function showDetailModal(cardElement) {
        const tableItem = cardElement.closest('.table-item');
        if (!tableItem || !elements.detailModal) return;

        const tableIdRaw = tableItem.dataset.tableId || 'Bàn';
        const tableId = !isNaN(Number(tableIdRaw)) ? Number(tableIdRaw) : tableIdRaw;
        const status = tableItem.dataset.status || TABLE_STATUSES.AVAILABLE;
        const location = tableItem.dataset.zone || DEFAULT_LOCATION;
        const capacity = `${tableItem.dataset.capacity || 0} Người`;
        const titleElement = elements.detailModal.querySelector('.detail-table-name');
        const locationElement = elements.detailModal.querySelector('.detail-table-location');
        const capacityElement = elements.detailModal.querySelector('.detail-table-capacity');
        const badgeElement = elements.detailModal.querySelector('.detail-table-status');
        const orderInfoElement = elements.detailModal.querySelector('.detail-order-info');
        const itemsSectionElement = elements.detailModal.querySelector('.detail-items-section');
        const itemsListElement = elements.detailModal.querySelector('.ordered-items-list');
        const actionsElement = elements.detailModal.querySelector('.detail-actions');
            const activeOrder = getActiveOrder(tableId);
        const orderedItems = activeOrder?.items || [];

        if (titleElement) titleElement.textContent = tableId;
        if (locationElement) locationElement.innerHTML = `<span class="material-symbols-outlined fs-5">location_on</span> ${location}`;
        if (capacityElement) capacityElement.innerHTML = `<span class="material-symbols-outlined fs-5">group</span> ${capacity}`;

        if (badgeElement) {
            const statusConfig = getStatusConfig(status);
            badgeElement.textContent = status;
            badgeElement.style.cssText = statusConfig.badgeStyle;
        }

        if (status === TABLE_STATUSES.OCCUPIED) {
            if (orderInfoElement) orderInfoElement.style.display = 'block';
            if (itemsSectionElement) itemsSectionElement.style.display = 'block';

            const totalElement = elements.detailModal.querySelector('.detail-table-total');
            const timeElement = elements.detailModal.querySelector('.detail-table-time');

            if (totalElement) totalElement.textContent = formatCurrency(activeOrder?.total || 0);
            if (timeElement) timeElement.textContent = activeOrder?.time || TABLE_STATUSES.OCCUPIED;

            if (itemsListElement) {
                itemsListElement.innerHTML = orderedItems.length > 0
                    ? orderedItems.map(item => `
                        <div class="d-flex justify-content-between align-items-center p-3 border-bottom last-child-border-0 bg-white">
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-light rounded-circle d-flex align-items-center justify-content-center fw-bold text-primary" style="width: 30px; height: 30px; font-size: 0.85rem;">
                                    ${item.quantity}
                                </div>
                                <div>
                                    <div class="fw-medium">${item.name}</div>
                                    <div class="text-muted" style="font-size: 0.75rem;">${formatCurrency(item.price)} / món</div>
                                </div>
                            </div>
                            <div class="fw-bold text-dark small">${formatCurrency((item.price || 0) * (item.quantity || 0))}</div>
                        </div>
                    `).join('')
                    : '<div class="p-3 text-secondary text-center">Chưa có món nào trong đơn hiện tại.</div>';
            }

            if (actionsElement) {
                actionsElement.innerHTML = `
                    <button type="button" class="btn btn-light px-4" data-bs-dismiss="modal">Đóng</button>
                    <button type="button" class="btn btn-outline-primary px-4 detail-view-order">Xem đơn</button>
                    <button type="button" class="btn btn-primary px-4 detail-main-btn">Thanh toán</button>
                `;
            }
        } else {
            if (orderInfoElement) orderInfoElement.style.display = 'none';
            if (itemsSectionElement) itemsSectionElement.style.display = 'none';

            let mainActionLabel = 'Mở đơn mới';
            if (status === TABLE_STATUSES.RESERVED) mainActionLabel = 'Nhận bàn';
            if (status === TABLE_STATUSES.CLEANING) mainActionLabel = 'Đã dọn xong';

            if (actionsElement) {
                actionsElement.innerHTML = `
                    <button type="button" class="btn btn-light px-4" data-bs-dismiss="modal">Đóng</button>
                    <button type="button" class="btn btn-primary px-4 detail-main-btn">${mainActionLabel}</button>
                `;
            }
        }

        const modal = new bootstrap.Modal(elements.detailModal);
        modal.show();

        const mainButton = actionsElement?.querySelector('.detail-main-btn');
        const viewOrderButton = actionsElement?.querySelector('.detail-view-order');

            if (mainButton) {
            mainButton.addEventListener('click', () => {
                modal.hide();

                if (status === TABLE_STATUSES.AVAILABLE) {
                    window.location.href = '/orders.html';
                } else if (status === TABLE_STATUSES.OCCUPIED) {
                    handlePayment(tableId);
                } else if (status === TABLE_STATUSES.RESERVED) {
                    handleCheckIn(tableId);
                } else {
                    handleCleaned(tableId);
                }
            }, { once: true });
        }

        if (viewOrderButton) {
            viewOrderButton.addEventListener('click', () => {
                window.location.href = '/orders.html';
            }, { once: true });
        }
    }

    async function handlePayment(tableId) {
        if (!ensureBackendReady()) return;
        if (!confirm(`Thanh toán cho ${tableId}?`)) return;

        const table = findTableById(tableId);
        if (!table) return;

        try {
            const updatedTable = await updateTableOnServer(table, { status: TABLE_STATUSES.CLEANING });
            state.tables = state.tables.map(item => item.id === tableId ? updatedTable : item);
            persistTables();

            const orders = getOrders();
            const activeOrder = orders.find(order =>
                (order.customer === tableId || order.table_id === tableId || order.tableId === tableId) &&
                !isCompletedOrderStatus(order.status)
            );

            if (activeOrder) {
                activeOrder.status = ORDER_STATUSES.COMPLETED;
                activeOrder.statusClass = 'bg-success';
                writeJson(STORAGE_KEYS.orders, orders);
            }

            // localStorage override removed — rely on backend status
            renderTables();
            showToast(`${tableId} đã thanh toán thành công!`);
        } catch (error) {
            console.error('Không cập nhật được trạng thái thanh toán:', error);
            showToast(`Không thể cập nhật trạng thái bàn trên backend: ${error.message}`, 'danger');
        }
    }

    async function handleCheckIn(tableId) {
        if (!ensureBackendReady()) return;

        const table = findTableById(tableId);
        if (!table) return;

        try {
            const updatedTable = await updateTableOnServer(table, { status: TABLE_STATUSES.OCCUPIED });
            state.tables = state.tables.map(item => item.id === tableId ? updatedTable : item);
            persistTables();
            renderTables();
            showToast(`Khách đã nhận ${tableId}!`);
        } catch (error) {
            console.error('Không cập nhật được trạng thái nhận bàn:', error);
            showToast(`Không thể cập nhật trạng thái bàn trên backend: ${error.message}`, 'danger');
        }
    }

    async function handleCleaned(tableId) {
        if (!ensureBackendReady()) return;

        const table = findTableById(tableId);
        if (!table) return;

        try {
            const updatedTable = await updateTableOnServer(table, { status: TABLE_STATUSES.AVAILABLE });
            state.tables = state.tables.map(item => item.id === tableId ? updatedTable : item);
            persistTables();
            renderTables();
            showToast(`Đã dọn dẹp ${tableId}!`);
        } catch (error) {
            console.error('Không cập nhật được trạng thái dọn dẹp:', error);
            showToast(`Không thể cập nhật trạng thái bàn trên backend: ${error.message}`, 'danger');
        }
    }

    function handleAddTableSubmit(event) {
        event.preventDefault();
        if (!ensureBackendReady()) return;

        const tableName = document.getElementById('tableName').value.trim();
        const tableLocation = document.getElementById('tableLocation').value;
        const tableCapacity = Number(document.getElementById('tableCapacity').value);

        if (!tableName || !tableLocation || !tableCapacity) {
            showToast('Vui lòng nhập đầy đủ thông tin bàn.', 'warning');
            return;
        }

        const payload = {
            name: tableName,
            zone: tableLocation,
            capacity: tableCapacity,
            status: TABLE_STATUSES.AVAILABLE
        };

        request(TABLES_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
            .then(async () => {
                await loadTables();
                showToast(`Đã thêm bàn mới: ${tableName}`);

                const modal = bootstrap.Modal.getInstance(elements.addTableModal);
                if (modal) modal.hide();
                elements.addTableForm?.reset();
            })
            .catch(error => {
                console.error('Không tạo được bàn:', error);
                showToast(`Không thể thêm bàn mới vào backend: ${error.message}`, 'danger');
            });
    }

    function handleDocumentClick(event) {
        if (!event.target || typeof event.target.closest !== 'function') return;

        const card = event.target.closest('.table-card');
        const qrButton = event.target.closest('.qr-btn');
        const actionButton = event.target.closest('.action-btn');

        if (card && !qrButton && (!actionButton || actionButton.textContent.trim() === 'Chi tiết')) {
            event.preventDefault();
            showDetailModal(card);
            return;
        }

        if (!actionButton || !card) return;

        event.preventDefault();
        const tableId = card.closest('.table-item')?.dataset.tableId;
        const actionText = actionButton.textContent.trim();

        if (!tableId) return;
        if (actionText === 'Thanh toán') handlePayment(tableId);
        if (actionText === 'Nhận bàn') handleCheckIn(tableId);
        if (actionText === 'Đã dọn xong') handleCleaned(tableId);
    }

    function bindEvents() {
        elements.locationFilter?.addEventListener('change', () => applyTableFilters());
        elements.statusFilter?.addEventListener('change', () => applyTableFilters());
        elements.sortFilter?.addEventListener('change', scheduleReloadTables);
        elements.searchInput?.addEventListener('input', scheduleReloadTables);
        elements.addTableForm?.addEventListener('submit', handleAddTableSubmit);
        document.addEventListener('click', handleDocumentClick);

        window.addEventListener('storage', event => {
            if (event.key === STORAGE_KEYS.orders) {
                renderTables();
            }
        });

        window.addEventListener('pageshow', event => {
            if (event.persisted) {
                renderTables();
            }
        });
    }

    bindEvents();
    updateFilterOptions();
    loadTables();


    document.addEventListener('click', function(e) {
        let btn = e.target.closest('button[data-bs-target="#qrModal"]');
        if (btn) {
            let tableName = "";
            let card = btn.closest('.table-card');
            if (card) {
                let h5 = card.querySelector('h5');
                if (h5) tableName = h5.textContent.trim();
            } else {
                let row = btn.closest('tr');
                if (row) {
                    let span = row.querySelector('.fw-semibold');
                    if (span) tableName = span.textContent.trim();
                    else tableName = row.children[1].textContent.trim();
                }
            }

            if (tableName) {
                let qrModal = document.getElementById('qrModal');
                if (qrModal) {
                    let nameEl = qrModal.querySelector('.qr-table-name');
                    if (nameEl) nameEl.textContent = tableName;

                    let targetUrl = "./customer-menu.html?table=" + encodeURIComponent(tableName);

                    let testLink = qrModal.querySelector('#qrTestLink');
                    if (testLink) testLink.href = targetUrl;

                    let directLink = qrModal.querySelector('#qrDirectLink');
                    if (directLink) directLink.href = targetUrl;
                }
            }
        }
    });
});
