import {
    ORDER_STATUSES,
    TABLE_STATUSES,
    isCompletedOrderStatus
} from './status-constants.js';

document.addEventListener('DOMContentLoaded', () => {
    const FV = window.FormValidation;
    const API_BASE_URL = 'http://localhost:7071/api';
    const TABLES_API_URL = `${API_BASE_URL}/RestaurantTables`;
    const ORDERS_API_URL = `${API_BASE_URL}/Orders`;
    const RESERVATIONS_API_URL = `${API_BASE_URL}/Reservations`;
    const PAYMENT_SETTINGS_URL = `${API_BASE_URL}/PaymentSettings`;
    const PREORDER_NOTE_TAG = '[PREORDER]';
    const ALL_OPTION = 'Tất cả';
    const DEFAULT_LOCATION = 'Khu chung';
    const DEFAULT_TABLE_LOCATIONS = [
        'Khu chung',
        'Trong nhà',
        'Ngoài trời',
        'Tầng 1',
        'Tầng 2',
        'Phòng VIP'
    ];
    const DEFAULT_SORT = 'name-asc';
    const LIST_PAGE_SIZE = 100;
    const RELOAD_DELAY_MS = 250;
    const STORAGE_KEYS = {
        orders: 'bistro_orders',
        tables: 'bistro_tables',
        pendingPreorders: 'bistro_pending_preorders'
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
        addTableLocation: document.getElementById('tableLocation'),
        toast: document.getElementById('liveToast'),
        toastMessage: document.getElementById('toastMessage'),
        addTableModal: document.getElementById('addTableModal'),
        detailModal: document.getElementById('tableDetailModal'),
        reservationAlertModal: document.getElementById('reservationAlertModal'),
        reservationAlertCustomer: document.getElementById('reservationAlertCustomer'),
        reservationAlertTable: document.getElementById('reservationAlertTable'),
        reservationAlertGuests: document.getElementById('reservationAlertGuests'),
        reservationAlertTime: document.getElementById('reservationAlertTime'),
        paymentModal: document.getElementById('paymentModal'),
        paymentModalOrderId: document.getElementById('paymentModalOrderId'),
        paymentModalCustomer: document.getElementById('paymentModalCustomer'),
        paymentModalTable: document.getElementById('paymentModalTable'),
        paymentModalTime: document.getElementById('paymentModalTime'),
        paymentModalItems: document.getElementById('paymentModalItems'),
        paymentModalTotal: document.getElementById('paymentModalTotal'),
        confirmPaymentBtn: document.getElementById('confirmPaymentBtn'),
        paymentModalQr: document.getElementById('paymentModalQr')
    };

    const state = {
        tables: [],
        orders: [],
        reservations: null,
        tableItems: [],
        backendReady: false,
        reloadTimeoutId: null,
        seenReservationNotifications: new Set()
    };

    function readJson(key, fallback) {
        return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getLocalReservations() {
        return Array.isArray(state.reservations)
            ? state.reservations
            : readJson('bistro_reservations', []);
    }

    function getReservationForTable(tableId) {
        return getLocalReservations().find(reservation =>
            String(reservation.tableId) === String(tableId)
            && (reservation.status === 'Đã xác nhận' || reservation.status === 'Đã đến' || reservation.status === 'Chờ xử lý')
        ) || null;
    }

    function getCustomerForReservation(reservation) {
        if (!reservation) return null;

        const localCustomers = readJson('bistro_customers', []);
        const matchedCustomer = localCustomers.find(customer =>
            String(customer.id) === String(reservation.customerId || reservation.CustomerId)
        );

        const name = matchedCustomer?.fullName
            || matchedCustomer?.name
            || reservation.customerName
            || reservation.CustomerName
            || null;
        const phone = matchedCustomer?.phone
            || reservation.customerPhone
            || reservation.CustomerPhone
            || null;

        if (!name && !phone && !matchedCustomer) {
            return null;
        }

        return {
            id: matchedCustomer?.id || reservation.customerId || reservation.CustomerId || null,
            name: name || 'Quý khách',
            fullName: name || 'Quý khách',
            phone: phone || '',
            email: matchedCustomer?.email || '',
            tier: matchedCustomer?.tier || 'new',
            visits: matchedCustomer?.visits || 0,
            totalSpent: matchedCustomer?.totalSpent || 0
        };
    }

    function isReservationReservedStatus(status) {
        return status === 'Đã xác nhận' || status === 'Chờ xử lý';
    }

    function isTableReservedLocally(tableId) {
        return getLocalReservations().some(reservation =>
            String(reservation.tableId) === String(tableId)
            && isReservationReservedStatus(reservation.status)
        );
    }

    function clearLocalReservation(tableId) {
        const nextReservations = getLocalReservations().filter(
            reservation => !(String(reservation.tableId) === String(tableId) && isReservationReservedStatus(reservation.status))
        );
        state.reservations = nextReservations;
        writeJson('bistro_reservations', nextReservations);
    }

    async function markReservationCheckedIn(tableId) {
        const reservation = getLocalReservations().find(item =>
            String(item.tableId) === String(tableId)
            && isReservationReservedStatus(item.status)
        );

        if (!reservation) return null;

        const updatedReservation = {
            id: reservation.id,
            customerId: reservation.customerId,
            tableId: reservation.tableId,
            reservationDate: reservation.reservationDate,
            reservationTime: reservation.reservationTime,
            guestCount: reservation.guestCount,
            status: 'Đã đến',
            notes: reservation.notes || null,
            createdAt: reservation.createdAt,
            updatedAt: new Date().toISOString()
        };

        try {
            await request(`${RESERVATIONS_API_URL}/${encodeURIComponent(reservation.id)}`, {
                method: 'PUT',
                body: JSON.stringify(updatedReservation)
            });
        } catch (error) {
            console.warn('Không thể cập nhật reservation sang Đã đến:', error.message);
        }

        state.reservations = getLocalReservations().map(item =>
            item.id === reservation.id
                ? { ...item, status: 'Đã đến', updatedAt: updatedReservation.updatedAt }
                : item
        );
        writeJson('bistro_reservations', state.reservations);
        return updatedReservation;
    }

    function getPendingPreorders() {
        return readJson(STORAGE_KEYS.pendingPreorders, []);
    }

    function savePendingPreorders(preorders) {
        writeJson(STORAGE_KEYS.pendingPreorders, preorders);
    }

    function findPendingPreorder(tableId) {
        const localPreorder = getPendingPreorders().find(preorder => String(preorder.tableId) === String(tableId)) || null;
        if (localPreorder) return localPreorder;

        const reservation = getLocalReservations().find(item =>
            String(item.tableId) === String(tableId)
            && (item.status === 'Đã xác nhận' || item.status === 'Đã đến')
        );
        if (!reservation?.notes || !String(reservation.notes).includes(PREORDER_NOTE_TAG)) return null;

        try {
            const rawNotes = String(reservation.notes);
            const markerIndex = rawNotes.indexOf(PREORDER_NOTE_TAG);
            const jsonText = rawNotes.slice(markerIndex + PREORDER_NOTE_TAG.length).trim();
            const parsed = JSON.parse(jsonText);
            return {
                tableId,
                customerId: reservation.customerId || null,
                customerName: reservation.customerName || null,
                itemsCount: Number(parsed.itemsCount || 0),
                total: Number(parsed.total || 0),
                items: Array.isArray(parsed.items) ? parsed.items : [],
                createdAt: reservation.createdAt || new Date().toISOString(),
                updatedAt: reservation.updatedAt || new Date().toISOString()
            };
        } catch (error) {
            console.warn('Không đọc được pre-order từ reservation notes:', error.message);
            return null;
        }
    }

    function removePendingPreorder(tableId) {
        savePendingPreorders(
            getPendingPreorders().filter(preorder => String(preorder.tableId) !== String(tableId))
        );
    }

    function getOrders() {
        return state.orders.length > 0
            ? state.orders
            : readJson(STORAGE_KEYS.orders, []);
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

    function playReservationAlertSound() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        try {
            const audioContext = new AudioContextClass();
            const now = audioContext.currentTime;
            const notes = [659.25, 783.99, 987.77];

            notes.forEach((frequency, index) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(frequency, now);

                gainNode.gain.setValueAtTime(0.0001, now);
                gainNode.gain.exponentialRampToValueAtTime(0.08, now + (index * 0.12) + 0.03);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + (index * 0.12) + 0.18);

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.start(now + (index * 0.12));
                oscillator.stop(now + (index * 0.12) + 0.2);
            });

            window.setTimeout(() => {
                audioContext.close().catch(() => {});
            }, 800);
        } catch (error) {
            console.warn('Không phát được âm thanh thông báo:', error.message);
        }
    }

    function formatReservationTime(value) {
        if (!value) return '-';

        if (typeof value === 'string' && value.includes('T')) {
            const date = new Date(value);
            if (!Number.isNaN(date.getTime())) {
                return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
            }
        }

        return String(value).slice(0, 5);
    }

    function formatReservationDateTime(reservation) {
        const dateValue = reservation?.reservationDate || reservation?.ReservationDate;
        const timeValue = reservation?.reservationTime || reservation?.ReservationTime;
        const parsedDate = dateValue ? new Date(dateValue) : null;
        const dateText = parsedDate && !Number.isNaN(parsedDate.getTime())
            ? parsedDate.toLocaleDateString('vi-VN')
            : '-';
        const timeText = formatReservationTime(timeValue);
        return `${dateText} ${timeText}`.trim();
    }

    async function showReservationAlert(payload) {
        if (!elements.reservationAlertModal) return;
        if (payload?.action !== 'created') return;

        const reservationId = payload?.reservationId;
        const notificationKey = `created:${reservationId}`;
        if (reservationId && state.seenReservationNotifications.has(notificationKey)) {
            return;
        }
        if (reservationId) {
            state.seenReservationNotifications.add(notificationKey);
        }

        let reservation = getLocalReservations().find(item => String(item.id) === String(reservationId));
        if (!reservation && reservationId) {
            try {
                reservation = await request(`${RESERVATIONS_API_URL}/${encodeURIComponent(reservationId)}`);
            } catch (error) {
                console.warn('Không tải được chi tiết reservation realtime:', error.message);
            }
        }

        const customerName = reservation?.customerName || reservation?.CustomerName || 'Khách mới';
        const tableName = reservation?.tableName || reservation?.TableName || (payload?.tableId ? `Bàn ${payload.tableId}` : '-');
        const guestCount = reservation?.guestCount || reservation?.GuestCount || '-';
        const bookingTime = reservation ? formatReservationDateTime(reservation) : 'Vừa đặt xong';

        if (elements.reservationAlertCustomer) elements.reservationAlertCustomer.textContent = customerName;
        if (elements.reservationAlertTable) elements.reservationAlertTable.textContent = tableName;
        if (elements.reservationAlertGuests) elements.reservationAlertGuests.textContent = `${guestCount} khách`;
        if (elements.reservationAlertTime) elements.reservationAlertTime.textContent = bookingTime;

        playReservationAlertSound();
        new bootstrap.Modal(elements.reservationAlertModal).show();
    }

    function updateRealtimeBadge(stateName) {
        const badge = document.getElementById('realtimeStatusTables');
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
        if (event?.type === 'tableChanged') {
            return `Ban ${(event.payload?.table?.name || event.payload?.table?.id || '')} vua duoc cap nhat.`;
        }
        if (event?.type === 'reservationChanged') {
            return 'Co thay doi moi ve dat ban.';
        }
        if (event?.type === 'orderChanged') {
            return 'Co thay doi moi tu don hang lien quan den ban.';
        }
        return 'Du lieu ban vua duoc dong bo realtime.';
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

    function isOrderForTable(order, tableId, tableName) {
        const tableIdStr = String(tableId);
        const tableNameStr = tableName ? String(tableName) : '';
        const candidates = [
            order?.customer,
            order?.table_id,
            order?.tableId,
            order?.TableId,
            order?.table,
            order?.tableName,
            order?.tableNumber
        ].filter(Boolean).map(value => String(value));

        return candidates.some(value => value === tableIdStr || (tableNameStr && value === tableNameStr));
    }

    function getOrderItems(order) {
        if (!order) return [];
        return order.items || order.Items || order.orderItems || order.OrderItems || [];
    }

    function getOrderTotal(order) {
        return Number(order?.total ?? order?.Total ?? order?.amount ?? order?.Amount ?? 0);
    }

    function getOrderStatus(order) {
        return order?.status ?? order?.Status ?? '';
    }

    function isPreArrivalOrder(order) {
        return Boolean(order?.isPreArrivalOrder ?? order?.IsPreArrivalOrder);
    }

    function getOrderTime(order) {
        return order?.time || order?.createdAt || order?.CreatedAt || TABLE_STATUSES.OCCUPIED;
    }

    function formatOrderDateTime(value) {
        if (!value) return '-';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return String(value);
        }
        return `${parsed.toLocaleDateString('vi-VN')} ${parsed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    function getOrderUpdatedAt(order) {
        return order?.updatedAt || order?.UpdatedAt || order?.createdAt || order?.CreatedAt || '';
    }

    function normalizeOrderItem(item) {
        const quantity = Number(item?.quantity ?? item?.Quantity ?? 0);
        const unitPrice = Number(item?.unitPrice ?? item?.UnitPrice ?? item?.price ?? item?.Price ?? 0);
        return {
            id: item?.id ?? item?.Id ?? null,
            orderId: item?.orderId ?? item?.OrderId ?? null,
            productId: Number(item?.productId ?? item?.ProductId ?? 0),
            productName: item?.productName ?? item?.ProductName ?? item?.name ?? 'Món',
            quantity,
            unitPrice,
            totalPrice: Number(item?.totalPrice ?? item?.TotalPrice ?? (unitPrice * quantity)),
            notes: item?.notes ?? item?.Notes ?? null,
            createdAt: item?.createdAt ?? item?.CreatedAt ?? new Date().toISOString()
        };
    }

    function normalizeOrder(order, fallbackTableId = null) {
        const normalizedItems = getOrderItems(order).map(normalizeOrderItem);
        const tableId = order?.tableId ?? order?.TableId ?? order?.table_id ?? fallbackTableId ?? null;

        return {
            id: order?.id ?? order?.Id ?? `ORD-${Date.now().toString().slice(-8)}`,
            customerId: order?.customerId ?? order?.CustomerId ?? null,
            customerName: order?.customerName ?? order?.CustomerName ?? null,
            accountId: order?.accountId ?? order?.AccountId ?? null,
            tableId,
            tableName: order?.tableName ?? order?.TableName ?? (tableId ? `Bàn ${tableId}` : null),
            itemsCount: Number(order?.itemsCount ?? order?.ItemsCount ?? normalizedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)),
            status: getOrderStatus(order) || ORDER_STATUSES.PENDING_CONFIRMATION,
            subtotal: Number(order?.subtotal ?? order?.Subtotal ?? normalizedItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)),
            discount: Number(order?.discount ?? order?.Discount ?? 0),
            total: getOrderTotal(order) || Number(normalizedItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)),
            paymentMethod: order?.paymentMethod ?? order?.PaymentMethod ?? 'cash',
            paymentStatus: order?.paymentStatus ?? order?.PaymentStatus ?? 'pending',
            notes: order?.notes ?? order?.Notes ?? null,
            createdAt: order?.createdAt ?? order?.CreatedAt ?? new Date().toISOString(),
            updatedAt: order?.updatedAt ?? order?.UpdatedAt ?? new Date().toISOString(),
            items: normalizedItems
        };
    }

    function getActiveOrder(tableId) {
        const table = findTableById(tableId);
        const tableName = table?.name || table?.id;
        const matchingOrders = getOrders()
            .filter(order => isOrderForTable(order, tableId, tableName) && !isCompletedOrderStatus(getOrderStatus(order)))
            .map(order => normalizeOrder(order, tableId));

        if (matchingOrders.length === 0) return null;

        matchingOrders.sort((left, right) => {
            const leftItems = getOrderItems(left).length;
            const rightItems = getOrderItems(right).length;
            if (leftItems !== rightItems) return rightItems - leftItems;

            const leftTime = Date.parse(getOrderUpdatedAt(left)) || 0;
            const rightTime = Date.parse(getOrderUpdatedAt(right)) || 0;
            return rightTime - leftTime;
        });

        return matchingOrders[0];
    }

    function buildOrderPayloadFromPreorder(tableId, preorder) {
        const orderId = `ORD-${Date.now().toString().slice(-8)}`;
        const items = (preorder?.items || []).map(item => {
            const quantity = Number(item.quantity || 0);
            const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
            return {
                OrderId: orderId,
                ProductId: Number(item.productId || 0),
                ProductName: item.productName || item.name || 'Món',
                Quantity: quantity,
                UnitPrice: unitPrice,
                TotalPrice: Number(item.totalPrice ?? (unitPrice * quantity)),
                Notes: item.notes || null,
                CreatedAt: new Date().toISOString()
            };
        });

        const subtotal = Number(items.reduce((sum, item) => sum + Number(item.TotalPrice || 0), 0));

        return {
            Id: orderId,
            CustomerId: preorder?.customerId || null,
            AccountId: null,
            TableId: Number(tableId) || null,
            Status: ORDER_STATUSES.PENDING_CONFIRMATION,
            Subtotal: subtotal,
            Discount: 0,
            Total: subtotal,
            PaymentMethod: 'cash',
            PaymentStatus: 'pending',
            Notes: `Tạo tự động khi nhận bàn${preorder?.customerName ? ` - ${preorder.customerName}` : ''}`,
            CreatedAt: preorder?.createdAt || new Date().toISOString(),
            UpdatedAt: new Date().toISOString(),
            OrderItems: items
        };
    }

    async function createOrderFromPendingPreorder(tableId) {
        const preorder = findPendingPreorder(tableId);
        if (!preorder) return null;

        const payload = buildOrderPayloadFromPreorder(tableId, preorder);
        const normalizedFallbackOrder = normalizeOrder(payload, tableId);

        try {
            const createdOrderResponse = await request(ORDERS_API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            const normalizedOrder = normalizeOrder(createdOrderResponse || payload, tableId);

            const nextOrders = [normalizedOrder, ...getOrders().filter(order => String(order.id || order.Id) !== String(normalizedOrder.id))];
            state.orders = nextOrders;
            writeJson(STORAGE_KEYS.orders, nextOrders);
            return normalizedOrder;
        } catch (error) {
            console.warn('Không thể tạo hóa đơn trên backend, dùng bản local tạm thời:', error.message);
            const nextOrders = [normalizedFallbackOrder, ...getOrders().filter(order => String(order.id || order.Id) !== String(normalizedFallbackOrder.id))];
            state.orders = nextOrders;
            writeJson(STORAGE_KEYS.orders, nextOrders);
            return normalizedFallbackOrder;
        }
    }

    function resolveDisplayStatus(table) {
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

    function buildAddTableLocationOptions() {
        const locations = [
            ...DEFAULT_TABLE_LOCATIONS,
            ...state.tables.map(table => table.zone).filter(Boolean)
        ];

        return [...new Set(locations)].map(location => ({
            value: location,
            label: location
        }));
    }

    function updateFilterOptions() {
        renderSelectOptions(elements.locationFilter, buildLocationOptions(), getSelectedLocation());
        renderSelectOptions(elements.statusFilter, STATUS_FILTER_OPTIONS, getSelectedStatus());
        renderSelectOptions(elements.sortFilter, SORT_OPTIONS, getSelectedSort());
        renderSelectOptions(elements.addTableLocation, buildAddTableLocationOptions(), elements.addTableLocation?.value || DEFAULT_LOCATION);
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
        const pendingPreorder = findPendingPreorder(table.id);

        if (displayStatus === TABLE_STATUSES.OCCUPIED) {
            return `
                <div class="border-top pt-3 d-flex justify-content-between align-items-center">
                    <span class="fw-bold text-dark">${formatCurrency(getOrderTotal(activeOrder) || pendingPreorder?.total || 0)}</span>
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
        const token = localStorage.getItem('auth_token');
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

    async function loadOrders() {
        try {
            const response = await request(`${ORDERS_API_URL}?page=1&pageSize=200&sortBy=createdAt&sortOrder=desc`);
            state.orders = Array.isArray(response?.items)
                ? response.items.map(order => normalizeOrder(order))
                : [];
            localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(state.orders));
        } catch (error) {
            console.warn('Không tải được đơn hàng từ backend:', error.message);
            state.orders = readJson(STORAGE_KEYS.orders, []).map(order => normalizeOrder(order));
        }
    }

    async function loadReservations() {
        try {
            const response = await request(`${RESERVATIONS_API_URL}?page=1&pageSize=200&sortBy=createdAt&sortOrder=desc`);
            state.reservations = Array.isArray(response?.items) ? response.items : [];
            writeJson('bistro_reservations', state.reservations);
        } catch (error) {
            console.warn('Không tải được reservation từ backend:', error.message);
            state.reservations = readJson('bistro_reservations', []);
        }
    }

    function findTableById(tableId) {
        return state.tables.find(table => String(table.id) === String(tableId));
    }

    function replaceTableInState(updatedTable, targetTableId) {
        state.tables = state.tables.map(item =>
            String(item.id) === String(targetTableId) ? updatedTable : item
        );
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
            const [response] = await Promise.all([
                request(`${TABLES_API_URL}?${buildTablesQueryString()}`),
                loadOrders(),
                loadReservations()
            ]);
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
        const tableRecord = findTableById(tableId);
        const displayTableName = tableRecord?.name || cardElement.querySelector('h5')?.textContent?.trim() || String(tableIdRaw);
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
        const pendingPreorder = findPendingPreorder(tableId);
        const orderedItems = getOrderItems(activeOrder).length > 0
            ? getOrderItems(activeOrder)
            : (pendingPreorder?.items || []);

        if (titleElement) titleElement.textContent = displayTableName;
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

            if (totalElement) totalElement.textContent = formatCurrency(getOrderTotal(activeOrder) || pendingPreorder?.total || 0);
            if (timeElement) timeElement.textContent = getOrderTime(activeOrder);

            if (itemsListElement) {
                itemsListElement.innerHTML = orderedItems.length > 0
                    ? orderedItems.map(item => `
                        <div class="d-flex justify-content-between align-items-center p-3 border-bottom last-child-border-0 bg-white">
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-light rounded-circle d-flex align-items-center justify-content-center fw-bold text-primary" style="width: 30px; height: 30px; font-size: 0.85rem;">
                                    ${item.quantity}
                                </div>
                                <div>
                                    <div class="fw-medium">${item.productName || item.ProductName || item.name || 'Mon an'}</div>
                                    <div class="text-muted" style="font-size: 0.75rem;">${formatCurrency(item.unitPrice ?? item.UnitPrice ?? item.price ?? 0)} / món</div>
                                </div>
                            </div>
                            <div class="fw-bold text-dark small">${formatCurrency(item.totalPrice ?? item.TotalPrice ?? ((item.unitPrice ?? item.UnitPrice ?? item.price ?? 0) * (item.quantity || 0)))}</div>
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

    async function processPayment(tableId) {
        const table = findTableById(tableId);
        if (!table) return;

        try {
            const updatedTable = await updateTableOnServer(table, { status: TABLE_STATUSES.CLEANING });
            replaceTableInState(updatedTable, tableId);
            persistTables();

            const orders = getOrders();
            const tableName = table?.name || table?.id;
            const activeOrder = orders.find(order =>
                isOrderForTable(order, tableId, tableName) && !isCompletedOrderStatus(getOrderStatus(order))
            );

            if (activeOrder) {
                activeOrder.status = ORDER_STATUSES.COMPLETED;
                activeOrder.paymentStatus = 'completed';
                activeOrder.statusClass = 'bg-success';
                writeJson(STORAGE_KEYS.orders, orders);

                try {
                    await request(`${ORDERS_API_URL}/${encodeURIComponent(activeOrder.id)}`, {
                        method: 'PUT',
                        body: JSON.stringify(activeOrder)
                    });
                } catch (error) {
                    console.warn('Không thể cập nhật trạng thái hóa đơn trên backend:', error.message);
                }
            }

            clearLocalReservation(tableId);
            removePendingPreorder(tableId);

            renderTables();
            showToast(`${tableId} đã thanh toán thành công!`);
        } catch (error) {
            console.error('Không cập nhật được trạng thái thanh toán:', error);
            showToast(`Không thể cập nhật trạng thái bàn trên backend: ${error.message}`, 'danger');
        }
    }

    async function populatePaymentModal(tableId) {
        if (!elements.paymentModal) return;

        const table = findTableById(tableId);
        const activeOrder = getActiveOrder(tableId);
        const reservation = getReservationForTable(tableId);
        const reservationCustomer = getCustomerForReservation(reservation);
        const resolvedOrderId = activeOrder?.id || '-';
        const resolvedCustomerName = activeOrder?.customerName
            || reservationCustomer?.name
            || reservation?.customerName
            || reservation?.CustomerName
            || 'Khách vãng lai';
        const resolvedTableName = activeOrder?.tableName
            || table?.name
            || table?.id
            || `Bàn ${tableId}`;
        const resolvedTime = formatOrderDateTime(activeOrder?.createdAt || activeOrder?.CreatedAt);

        elements.paymentModalOrderId && (elements.paymentModalOrderId.textContent = resolvedOrderId);
        elements.paymentModalCustomer && (elements.paymentModalCustomer.textContent = resolvedCustomerName);
        elements.paymentModalTable && (elements.paymentModalTable.textContent = resolvedTableName);
        elements.paymentModalTime && (elements.paymentModalTime.textContent = resolvedTime);

        if (elements.paymentModalItems) {
            const items = getOrderItems(activeOrder);
            elements.paymentModalItems.innerHTML = items.length > 0
                ? items.map(item => `
                    <div class="d-flex justify-content-between align-items-center p-2 border-bottom last-child-border-0 bg-white">
                        <div class="d-flex align-items-center gap-3">
                            <div class="bg-light rounded-circle d-flex align-items-center justify-content-center fw-bold text-primary" style="width: 30px; height: 30px; font-size: 0.85rem;">
                                ${item.quantity}
                            </div>
                            <div>
                                <div class="fw-medium">${item.productName || item.name || 'Món'}</div>
                                <div class="text-muted" style="font-size: 0.75rem;">${formatCurrency(item.unitPrice ?? item.price ?? 0)} / món</div>
                            </div>
                        </div>
                        <div class="fw-bold text-dark small">${formatCurrency(item.totalPrice ?? ((item.unitPrice ?? item.price ?? 0) * (item.quantity || 0)))}</div>
                    </div>
                `).join('')
                : '<div class="p-3 text-secondary text-center">Chưa có món nào trong đơn hiện tại.</div>';
        }

        const total = getOrderTotal(activeOrder);
        if (elements.paymentModalTotal) {
            elements.paymentModalTotal.textContent = formatCurrency(total);
        }

        if (elements.paymentModalQr) {
            try {
                const settings = await request(PAYMENT_SETTINGS_URL);
                if (settings?.qrCodeUrl) {
                    const qrUrl = new URL(settings.qrCodeUrl);
                    qrUrl.searchParams.set('amount', total || 0);
                    qrUrl.searchParams.set('addInfo', `Thanh toan ban ${tableId}`);
                    elements.paymentModalQr.src = qrUrl.toString();
                } else {
                    elements.paymentModalQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`ThanhToan:${tableId}|${total || 0}VND`)}`;
                }
            } catch (_) {
                elements.paymentModalQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`ThanhToan:${tableId}|${total || 0}VND`)}`;
            }
        }

        // Wire confirm button to process payment for this table (once)
        if (elements.confirmPaymentBtn && elements.paymentModal) {
            const btn = elements.confirmPaymentBtn;
            const modalEl = elements.paymentModal;
            btn.replaceWith(btn.cloneNode(true));
            elements.confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
            elements.confirmPaymentBtn.addEventListener('click', () => processPayment(tableId), { once: true });
        }
    }

    async function handlePayment(tableId) {
        if (!ensureBackendReady()) return;

        await populatePaymentModal(tableId);

        if (elements.paymentModal) {
            const modal = new bootstrap.Modal(elements.paymentModal);
            modal.show();
        }
    }

    async function handleCheckIn(tableId) {
        if (!ensureBackendReady()) return;

        const table = findTableById(tableId);
        if (!table) return;

        let createdOrder = null;

        try {
            await markReservationCheckedIn(tableId);
            const updatedTable = await updateTableOnServer(table, { status: TABLE_STATUSES.OCCUPIED });
            replaceTableInState(updatedTable, tableId);
            persistTables();
            clearLocalReservation(tableId);
            renderTables();
        } catch (error) {
            console.error('Không cập nhật được trạng thái nhận bàn:', error);
            showToast(`Không thể cập nhật trạng thái bàn trên backend: ${error.message}`, 'danger');
            return;
        }

        try {
            createdOrder = await createOrderFromPendingPreorder(tableId);
        } catch (error) {
            console.error('Không tạo được hóa đơn khi nhận bàn:', error);
        }

        try {
            await Promise.all([loadOrders(), loadReservations()]);
        } catch (error) {
            console.warn('Không thể đồng bộ lại orders/reservations sau khi nhận bàn:', error?.message || error);
        }

        renderTables();
        showToast(
            createdOrder
                ? `Khách đã nhận ${tableId}. Hóa đơn đã được tạo tự động.`
                : `Khách đã nhận ${tableId}!`
        );
    }

    async function handleCleaned(tableId) {
        if (!ensureBackendReady()) return;

        const table = findTableById(tableId);
        if (!table) return;

        try {
            const updatedTable = await updateTableOnServer(table, { status: TABLE_STATUSES.AVAILABLE });
            replaceTableInState(updatedTable, tableId);
            persistTables();
            renderTables();
            clearLocalReservation(tableId);
            removePendingPreorder(tableId);
            showToast(`Đã dọn dẹp ${tableId}!`);
        } catch (error) {
            console.error('Không cập nhật được trạng thái dọn dẹp:', error);
            showToast(`Không thể cập nhật trạng thái bàn trên backend: ${error.message}`, 'danger');
        }
    }

    function handleAddTableSubmit(event) {
        event.preventDefault();
        if (!ensureBackendReady()) return;

        const tableNameField = document.getElementById('tableName');
        const tableLocationField = document.getElementById('tableLocation');
        const tableCapacityField = document.getElementById('tableCapacity');
        const tableName = FV?.normalizeWhitespace(tableNameField.value) || tableNameField.value.trim();
        const tableLocation = FV?.normalizeWhitespace(tableLocationField.value) || tableLocationField.value;
        const tableCapacity = Number(tableCapacityField.value);
        let isValid = true;

        FV?.clearFormErrors(elements.addTableForm);

        if (!tableName) {
            isValid = FV ? FV.setFieldError(tableNameField, 'Vui lòng nhập tên bàn.') : false;
        } else if (tableName.length < 2 || tableName.length > 50) {
            isValid = FV ? FV.setFieldError(tableNameField, 'Tên bàn phải từ 2 đến 50 ký tự.') : false;
        } else {
            tableNameField.value = tableName;
            FV?.markFieldValid(tableNameField);
        }

        if (!tableLocation) {
            isValid = FV ? FV.setFieldError(tableLocationField, 'Vui lòng chọn khu vực.') : false;
        } else {
            tableLocationField.value = tableLocation;
            FV?.markFieldValid(tableLocationField);
        }

        if (!tableCapacityField.value) {
            isValid = FV ? FV.setFieldError(tableCapacityField, 'Vui lòng nhập sức chứa.') : false;
        } else if (!Number.isInteger(tableCapacity) || tableCapacity < 1 || tableCapacity > 20) {
            isValid = FV ? FV.setFieldError(tableCapacityField, 'Sức chứa phải từ 1 đến 20 người.') : false;
        } else {
            FV?.markFieldValid(tableCapacityField);
        }

        if (!isValid) {
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
        FV?.enableInstantClear(elements.addTableForm);
        elements.addTableForm?.addEventListener('submit', handleAddTableSubmit);
        elements.addTableModal?.addEventListener('show.bs.modal', () => {
            renderSelectOptions(elements.addTableLocation, buildAddTableLocationOptions(), DEFAULT_LOCATION);
        });
        document.addEventListener('click', handleDocumentClick);

        window.addEventListener('storage', event => {
            if (event.key === STORAGE_KEYS.orders) {
                state.orders = readJson(STORAGE_KEYS.orders, []);
                renderTables();
            }

            if (event.key === STORAGE_KEYS.pendingPreorders || event.key === 'bistro_reservations') {
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
    window.RestaurantRealtime?.connect?.({
        onConnectionStateChange: updateRealtimeBadge,
        onReservationChanged: async (payload) => {
            if (payload?.action === 'created') {
                await loadReservations();
            }
        },
        onAnyChange: (event) => {
            scheduleReloadTables();
            showToast(getRealtimeMessage(event), 'warning');
        }
    });


    document.addEventListener('click', function(e) {
        let btn = e.target.closest('button[data-bs-target="#qrModal"]');
        if (btn) {
            let tableName = "";
            let tableId = "";
            let card = btn.closest('.table-card');
            if (card) {
                let h5 = card.querySelector('h5');
                if (h5) tableName = h5.textContent.trim();
                tableId = card.closest('.table-item')?.dataset.tableId || tableName;
            } else {
                let row = btn.closest('tr');
                if (row) {
                    let span = row.querySelector('.fw-semibold');
                    if (span) tableName = span.textContent.trim();
                    else tableName = row.children[1].textContent.trim();
                    tableId = row.dataset.id || tableName;
                }
            }

            if (tableName) {
                let qrModal = document.getElementById('qrModal');
                if (qrModal) {
                    let nameEl = qrModal.querySelector('.qr-table-name');
                    if (nameEl) nameEl.textContent = tableName;

                    qrModal.dataset.tableId = tableId || tableName;
                    let targetUrl = "./customer-order.html?table=" + encodeURIComponent(tableId || tableName);

                    let testLink = qrModal.querySelector('#qrTestLink');
                    if (testLink) testLink.href = targetUrl;

                    let directLink = qrModal.querySelector('#qrDirectLink');
                    if (directLink) directLink.href = targetUrl;
                }
            }
        }
    });

    document.getElementById('qrDirectLink')?.addEventListener('click', (event) => {
        const qrModal = document.getElementById('qrModal');
        const tableId = qrModal?.dataset.tableId;
        if (!tableId) return;

        sessionStorage.setItem('bookedTable', String(tableId));

        const reservation = getReservationForTable(tableId);
        const customer = getCustomerForReservation(reservation);
        if (!customer) return;

        sessionStorage.setItem('customerName', customer.name || 'Quý khách');
        if (customer.phone) {
            sessionStorage.setItem('customerPhone', customer.phone);
        }
        sessionStorage.setItem('current_demo_customer', JSON.stringify(customer));
    });
});
