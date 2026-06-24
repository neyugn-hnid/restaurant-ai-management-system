import { ORDER_STATUSES, TABLE_STATUSES } from './status-constants.js';
document.addEventListener('DOMContentLoaded', async () => {
    const FV = window.FormValidation;
    const API_BASE_URL = window.API_BASE_URL;
    const ORDERS_API_URL = `${API_BASE_URL}/Orders`;
    const TABLES_API_URL = `${API_BASE_URL}/RestaurantTables`;
    const PAYMENT_SETTINGS_URL = `${API_BASE_URL}/PaymentSettings`;
    const ITEMS_PER_PAGE = 10;
    const STATUS_FILTER_OPTIONS = [
        { value: 'Tất cả', label: 'Tất cả trạng thái' },
        ...Object.entries(ORDER_STATUSES).map(([, val]) => ({ value: val, label: val }))
    ];
    const elements = {
        searchInput: document.getElementById('searchInput'),
        statusFilter: document.getElementById('statusFilter'),
        tableBody: document.getElementById('ordersTableBody'),
        addOrderForm: document.getElementById('addOrderForm'),
        updateStatusForm: document.getElementById('updateStatusForm'),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
        confirmToKitchenBtn: document.getElementById('confirmToKitchenBtn'),
        confirmPaymentBtn: document.getElementById('confirmPaymentBtn'),
        statTotal: document.getElementById('stat-total'),
        statPending: document.getElementById('stat-pending'),
        statCooking: document.getElementById('stat-cooking'),
        statCompleted: document.getElementById('stat-completed')
    };
    const state = {
        orders: JSON.parse(localStorage.getItem('bistro_orders') || '[]'),
        currentPage: 1,
        totalPages: 1,
        currentFilter: 'Tất cả',
        currentSearch: '',
        orderToDeleteId: null,
        orderToUpdateId: null,
        currentPaymentOrderId: null,
        currentOrderDetailsId: null
    };
    window.addEventListener('storage', (e) => {
        if (e.key === 'bistro_orders') {
            state.orders = JSON.parse(localStorage.getItem('bistro_orders') || '[]');
            renderOrders();
        }
    });
    function renderSelectOptions(selectElement, options, selectedValue) {
        if (!selectElement) return;
        selectElement.innerHTML = options
            .map(opt => `<option value="${opt.value}"${opt.value === selectedValue ? ' selected' : ''}>${opt.label}</option>`)
            .join('');
    }
    async function request(url, options = {}) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...(options.headers || {}) },
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
    function showToast(message, type = 'success') {
        const toast = document.getElementById('liveToast');
        const msg = document.getElementById('toastMessage');
        if (!toast || !msg) { alert(message); return; }
        msg.textContent = message;
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        new bootstrap.Toast(toast, { delay: 3000 }).show();
    }
    function updateRealtimeBadge(stateName) {
        const badge = document.getElementById('realtimeStatusOrders');
        if (!badge) return;
        if (stateName === 'connected') {
            badge.className = 'badge rounded-pill text-bg-success';
            badge.textContent = 'Realtime: da ket noi';
            return;
        }
        if (stateName === 'connecting' || stateName === 'reconnecting') {
            badge.className = 'badge rounded-pill text-bg-warning';
            badge.textContent = 'Realtime: dang ket noi';
            return;
        }
        badge.className = 'badge rounded-pill text-bg-secondary';
        badge.textContent = 'Realtime: mat ket noi';
    }
    function getRealtimeMessage(event) {
        if (event?.type === 'orderChanged') return 'Don hang vua duoc cap nhat tu thiet bi khac.';
        if (event?.type === 'tableChanged') return 'Trang thai ban lien quan vua thay doi.';
        if (event?.type === 'reservationChanged') return 'Dat ban lien quan vua duoc cap nhat.';
        return 'Du lieu vua duoc dong bo realtime.';
    }
    function updateStats() {
        const setVal = (el, val) => { if (el) el.textContent = val; };
        setVal(elements.statTotal, state.orders.length);
        setVal(elements.statPending, state.orders.filter(o => o.status === ORDER_STATUSES.PENDING_CONFIRMATION || o.status === ORDER_STATUSES.PENDING).length);
        setVal(elements.statCooking, state.orders.filter(o => o.status === ORDER_STATUSES.PREPARING).length);
        setVal(elements.statCompleted, state.orders.filter(o => o.status === ORDER_STATUSES.COMPLETED || o.status === ORDER_STATUSES.SERVED).length);
    }
    function getStatusBadgeClass(status) {
        const s = status || '';
        if (s.includes('Chờ') || s === ORDER_STATUSES.PENDING) return 'bg-warning text-dark';
        if (s.includes('Đang chế biến') || s === ORDER_STATUSES.PREPARING) return 'bg-info text-white';
        if (s.includes('Hoàn thành') || s.includes('Đã phục vụ') || s === ORDER_STATUSES.COMPLETED || s === ORDER_STATUSES.SERVED) return 'bg-success';
        if (s.includes('Hủy') || s === ORDER_STATUSES.CANCELLED) return 'bg-danger';
        return 'bg-secondary';
    }
    async function loadAndRenderOrders(resetPage = false) {
        if (resetPage) state.currentPage = 1;
        try {
            const query = new URLSearchParams({
                page: state.currentPage,
                pageSize: ITEMS_PER_PAGE,
                searchTerm: state.currentSearch,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            });
            const resp = await request(`${ORDERS_API_URL}?${query}`);
            if (resp?.items) {
                state.orders = resp.items;
                state.totalPages = resp.pageCount || Math.ceil((resp.totalItemCount || resp.items.length) / ITEMS_PER_PAGE) || 1;
                localStorage.setItem('bistro_orders', JSON.stringify(state.orders));
            }
        } catch (err) {
            console.warn('Không thể tải đơn hàng từ API:', err.message);
            state.totalPages = Math.ceil(state.orders.length / ITEMS_PER_PAGE) || 1;
        }
        updateStats();
        renderOrders();
    }
    function getFilteredOrders() {
        return state.orders.filter(order => {
            const matchesFilter = state.currentFilter === 'Tất cả' || order.status === state.currentFilter;
            const s = state.currentSearch.toLowerCase();
            const matchesSearch = !s ||
                (order.id || '').toLowerCase().includes(s) ||
                (order.customerName || '').toLowerCase().includes(s) ||
                (order.tableName || '').toLowerCase().includes(s);
            return matchesFilter && matchesSearch;
        });
    }
    function renderOrders() {
        if (!elements.tableBody) return;
        const filtered = getFilteredOrders();
        const pageData = filtered;
        if (pageData.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Không tìm thấy đơn hàng nào.</td></tr>';
            renderPagination();
            return;
        }
        elements.tableBody.innerHTML = pageData.map(o => {
            const badgeClass = getStatusBadgeClass(o.status);
            const total = Number(o.total || 0).toLocaleString('vi-VN');
            const customerName = o.customerName || '-';
            const tableName = o.tableName || '';
            const subtext = tableName && o.customerName ? tableName : '';
            const icon = o.customerName ? 'person' : 'table_restaurant';
            const createdAt = o.createdAt ? new Date(o.createdAt) : null;
            const timeStr = createdAt ? createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
            const dateStr = createdAt ? createdAt.toLocaleDateString('vi-VN') : '';
            return `
                <tr>
                    <td class="ps-4"><a href="#" class="text-decoration-none fw-semibold order-detail-link" data-id="${o.id}">#${o.id}</a></td>
                    <td><div class="small">${timeStr} <span class="text-muted">${dateStr}</span></div></td>
                    <td>
                        <div class="d-flex align-items-center gap-2">
                            <div><div class="fw-medium">${customerName}</div><small class="text-muted">${subtext}</small></div>
                        </div>
                    </td>
                    <td><span class="badge bg-light text-dark">${o.itemsCount || 0} món</span></td>
                    <td class="fw-semibold">${total} ₫</td>
                    <td><span class="badge ${badgeClass}">${o.status || 'N/A'}</span></td>
                    <td class="text-end pe-4">
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center payment-btn" data-id="${o.id}" title="Thanh toán" style="width:32px;height:32px;border-radius:50%;color:var(--text-soft) !important;background-color:#fff !important;">
                                <span class="material-symbols-outlined icon-sm">payments</span>
                            </button>
                            <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center status-btn" data-id="${o.id}" title="Cập nhật" style="width:32px;height:32px;border-radius:50%;color:var(--text-soft) !important;background-color:#fff !important;">
                                <span class="material-symbols-outlined icon-sm">edit</span>
                            </button>
                            <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center delete-btn" data-id="${o.id}" title="Xóa" style="width:32px;height:32px;border-radius:50%;color:#dc3545 !important;background-color:#fff !important;">
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
        document.querySelectorAll('.order-detail-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                state.currentOrderDetailsId = link.dataset.id;
                const order = state.orders.find(o => o.id === state.currentOrderDetailsId);
                if (!order) return;
                const createdAt = order.createdAt ? new Date(order.createdAt) : null;
                document.getElementById('detailsModalOrderId').textContent = `#${order.id}`;
                document.getElementById('detailsModalCustomer').textContent = order.customerName || '-';
                document.getElementById('detailsModalTable').textContent = order.tableName || '-';
                document.getElementById('detailsModalTime').textContent = createdAt
                    ? `${createdAt.toLocaleDateString('vi-VN')} ${createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                    : '-';
                renderOrderItems(document.getElementById('detailsModalItems'), order);
                new bootstrap.Modal(document.getElementById('orderDetailsModal')).show();
            });
        });
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                state.currentPaymentOrderId = btn.dataset.id;
                const order = state.orders.find(o => o.id === state.currentPaymentOrderId);
                if (!order) return;
                const createdAt = order.createdAt ? new Date(order.createdAt) : null;
                const total = Number(order.total || 0).toLocaleString('vi-VN');
                document.getElementById('paymentModalOrderId').textContent = `#${order.id}`;
                document.getElementById('paymentModalCustomer').textContent = order.customerName || '-';
                document.getElementById('paymentModalTable').textContent = order.tableName || '-';
                document.getElementById('paymentModalTime').textContent = createdAt
                    ? `${createdAt.toLocaleDateString('vi-VN')} ${createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                    : '-';
                document.getElementById('paymentModalTotal').textContent = `${total} ₫`;
                renderOrderItems(document.getElementById('paymentModalItems'), order);
                const qrImg = document.getElementById('paymentModalQr');
                try {
                    const settings = await request(PAYMENT_SETTINGS_URL);
                    if (settings?.qrCodeUrl) {
                        const qrUrl = new URL(settings.qrCodeUrl);
                        qrUrl.searchParams.set('amount', order.total || 0);
                        qrUrl.searchParams.set('addInfo', `Thanh toan don ${order.id}`);
                        qrImg.src = qrUrl.toString();
                    } else {
                        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`ThanhToan:${order.id}|${order.total || 0}VND`)}`;
                    }
                } catch (_) {
                    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`ThanhToan:${order.id}|${order.total || 0}VND`)}`;
                }
                new bootstrap.Modal(document.getElementById('paymentModal')).show();
            });
        });
        document.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.orderToUpdateId = btn.dataset.id;
                new bootstrap.Modal(document.getElementById('updateStatusModal')).show();
            });
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.orderToDeleteId = btn.dataset.id;
                new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
            });
        });
    }
    function renderPagination() {
        const container = document.querySelector('.pagination');
        if (!container) return;
        const filtered = getFilteredOrders();
        const totalPages = state.currentFilter === 'Tất cả'
            ? Math.max(1, state.totalPages)
            : Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
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
                if (state.currentFilter === 'Tất cả') {
                    loadAndRenderOrders();
                } else {
                    renderOrders();
                }
            });
        });
    }
    function renderOrderItems(container, order) {
        if (!container) return;
        const items = order?.items || order?.orderItems || [];
        if (!items.length) {
            container.innerHTML = '<div class="text-center text-muted py-3">Không có món ăn nào trong đơn này.</div>';
            return;
        }
        container.innerHTML = items.map(item => `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                    <div class="fw-medium text-dark">${item.productName || item.name || 'Món ăn'}</div>
                    <small class="text-muted">SL: ${item.quantity || 0}</small>
                </div>
                <div class="fw-semibold text-dark">${Number(item.totalPrice ?? ((item.price || 0) * (item.quantity || 0))).toLocaleString('vi-VN')} ₫</div>
            </div>
        `).join('');
    }
    function bindEvents() {
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', () => {
                state.currentSearch = elements.searchInput.value.toLowerCase().trim();
                state.currentPage = 1;
                renderOrders();
            });
        }
        elements.statusFilter?.addEventListener('change', () => {
            state.currentFilter = elements.statusFilter.value;
            state.currentPage = 1;
            renderOrders();
        });
        elements.confirmDeleteBtn?.addEventListener('click', async () => {
            if (!state.orderToDeleteId) return;
            try { await request(`${ORDERS_API_URL}/${encodeURIComponent(state.orderToDeleteId)}`, { method: 'DELETE' }); } catch (_) {}
            state.orders = state.orders.filter(o => o.id !== state.orderToDeleteId);
            localStorage.setItem('bistro_orders', JSON.stringify(state.orders));
            state.orderToDeleteId = null;
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
            renderOrders();
            showToast('Đã xóa đơn hàng!');
        });
        elements.confirmToKitchenBtn?.addEventListener('click', async () => {
            if (!state.currentOrderDetailsId) return;
            const idx = state.orders.findIndex(o => o.id === state.currentOrderDetailsId);
            if (idx !== -1) {
                state.orders[idx].status = ORDER_STATUSES.PREPARING;
                try { await request(`${ORDERS_API_URL}/${encodeURIComponent(state.orders[idx].id)}`, { method: 'PUT', body: JSON.stringify(state.orders[idx]) }); } catch (_) {}
                localStorage.setItem('bistro_orders', JSON.stringify(state.orders));
            }
            state.currentOrderDetailsId = null;
            bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'))?.hide();
            renderOrders();
            showToast('Đã chuyển xuống bếp!');
        });
        elements.confirmPaymentBtn?.addEventListener('click', async () => {
            if (!state.currentPaymentOrderId) return;
            const idx = state.orders.findIndex(o => o.id === state.currentPaymentOrderId);
            if (idx !== -1) {
                state.orders[idx].status = ORDER_STATUSES.COMPLETED;
                state.orders[idx].paymentStatus = 'completed';
                try { await request(`${ORDERS_API_URL}/${encodeURIComponent(state.orders[idx].id)}`, { method: 'PUT', body: JSON.stringify(state.orders[idx]) }); } catch (_) {}
                localStorage.setItem('bistro_orders', JSON.stringify(state.orders));
                const tableName = state.orders[idx].tableName || '';
                const tableId = state.orders[idx].tableId || (tableName ? tableName.replace(/ban\s*/i, '').trim() : '');
                if (tableId) {
                    try {
                        await request(`${TABLES_API_URL}/${encodeURIComponent(tableId)}`, {
                            method: 'PUT',
                            body: JSON.stringify({ status: TABLE_STATUSES.CLEANING })
                        });
                    } catch (_) {}
                }
            }
            state.currentPaymentOrderId = null;
            bootstrap.Modal.getInstance(document.getElementById('paymentModal'))?.hide();
            renderOrders();
            showToast('Thanh toán thành công!');
        });
    elements.addOrderForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerField = document.getElementById('newOrderCustomer');
        const totalField = document.getElementById('newOrderTotal');
        const statusField = document.getElementById('newOrderStatus');
        const customerInput = customerField.value.trim();
        const totalStr = totalField.value;
        const status = statusField.value;
        let isValid = true;
        FV?.clearFormErrors(elements.addOrderForm);
        if (!customerInput) {
            isValid = FV ? FV.setFieldError(customerField, 'Vui lòng nhập khách hàng hoặc số bàn.') : false;
        } else if (customerInput.length < 2 || customerInput.length > 100) {
            isValid = FV ? FV.setFieldError(customerField, 'Tên khách hàng hoặc số bàn phải từ 2 đến 100 ký tự.') : false;
        } else {
            FV?.markFieldValid(customerField);
        }
        if (!totalStr) {
            isValid = FV ? FV.setFieldError(totalField, 'Vui lòng nhập tổng tiền.') : false;
        } else if (!Number.isFinite(Number(totalStr)) || Number(totalStr) <= 0) {
            isValid = FV ? FV.setFieldError(totalField, 'Tổng tiền phải lớn hơn 0.') : false;
        } else {
            FV?.markFieldValid(totalField);
        }
        if (!status) {
            isValid = FV ? FV.setFieldError(statusField, 'Vui lòng chọn trạng thái.') : false;
        } else {
            FV?.markFieldValid(statusField);
        }
        if (!isValid) return;
            const isTable = customerInput.toLowerCase().includes('bàn');
            const tableNumber = isTable ? customerInput.replace(/bàn\s*/i, '').trim() : '';
            const newOrder = {
                id: `ORD-${Math.floor(Math.random() * 9000) + 1000}`,
                customerName: isTable ? null : customerInput,
                tableId: isTable && tableNumber ? parseInt(tableNumber, 10) : null,
                tableName: isTable ? customerInput : null,
                itemsCount: 1,
                subtotal: parseInt(totalStr, 10) || 0,
                discount: 0,
                total: parseInt(totalStr, 10) || 0,
                status,
                paymentMethod: 'cash',
                paymentStatus: 'Pending'
            };
            try {
                const created = await request(ORDERS_API_URL, { method: 'POST', body: JSON.stringify(newOrder) });
                state.orders.unshift(created || newOrder);
            } catch (_) { state.orders.unshift(newOrder); }
            localStorage.setItem('bistro_orders', JSON.stringify(state.orders));
            bootstrap.Modal.getInstance(document.getElementById('addOrderModal'))?.hide();
            elements.addOrderForm.reset();
            renderOrders();
            showToast('Tạo đơn hàng mới thành công!');
        });
    elements.updateStatusForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!state.orderToUpdateId) return;
        const statusField = document.getElementById('updateStatusSelect');
        const newStatus = statusField.value;
        let isValid = true;
        FV?.clearFormErrors(elements.updateStatusForm);
        if (!newStatus) {
            isValid = FV ? FV.setFieldError(statusField, 'Vui lòng chọn trạng thái mới.') : false;
        } else {
            FV?.markFieldValid(statusField);
        }
        if (!isValid) return;
        const idx = state.orders.findIndex(o => o.id === state.orderToUpdateId);
            if (idx !== -1) {
                state.orders[idx].status = newStatus;
                try { await request(`${ORDERS_API_URL}/${encodeURIComponent(state.orders[idx].id)}`, { method: 'PUT', body: JSON.stringify(state.orders[idx]) }); } catch (_) {}
                localStorage.setItem('bistro_orders', JSON.stringify(state.orders));
            }
            state.orderToUpdateId = null;
            bootstrap.Modal.getInstance(document.getElementById('updateStatusModal'))?.hide();
            renderOrders();
            showToast('Cập nhật trạng thái thành công!');
        });
    }
    renderSelectOptions(elements.statusFilter, STATUS_FILTER_OPTIONS, 'Tất cả');
    FV?.enableInstantClear(elements.addOrderForm);
    FV?.enableInstantClear(elements.updateStatusForm);
    bindEvents();
    await loadAndRenderOrders(true);
    window.RestaurantRealtime?.connect?.({
        onConnectionStateChange: updateRealtimeBadge,
        onAnyChange: async (event) => {
            await loadAndRenderOrders();
            showToast(getRealtimeMessage(event), 'warning');
        }
    });
});
