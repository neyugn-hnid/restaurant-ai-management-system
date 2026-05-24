const API_BASE = 'http://localhost:7071/api';
const TABLES_URL = `${API_BASE}/RestaurantTables`;
const RESERVATIONS_URL = `${API_BASE}/Reservations`;
const CUSTOMERS_URL = `${API_BASE}/Customers`;
const AI_RECOMMENDATIONS_URL = `${API_BASE}/AiRecommendations`;

let pendingBookingData = null;
let selectedTableId = null;
let realtimeReloadTimeoutId = null;

function upsertLocalReservation(reservation) {
    const reservations = JSON.parse(localStorage.getItem('bistro_reservations') || '[]');
    const nextReservations = reservations.filter(item => String(item.tableId) !== String(reservation.tableId));
    nextReservations.unshift(reservation);
    localStorage.setItem('bistro_reservations', JSON.stringify(nextReservations));
}

function validateVietnamesePhone(phone) {
    const mobilePattern = /^0[3578]\d{8}$/;
    const landlinePattern = /^02\d{8,10}$/;
    return mobilePattern.test(phone) || landlinePattern.test(phone);
}

// Validation functions for all fields
function validateName(name) {
    return name.trim().length >= 3;
}

function validateDate(date) {
    if (!date) return false;
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
}

function validateTime(time) {
    return time && time !== '';
}

function validateGuests(guests) {
    const num = parseInt(guests);
    return num >= 1 && num <= 20;
}

function updateRealtimeBadge(stateName) {
    const badge = document.getElementById('realtimeStatusMap');
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

function showRealtimeToast(message) {
    const toast = document.getElementById('realtimeToastMap');
    const label = document.getElementById('realtimeToastMapMessage');
    if (!toast || !label) return;

    label.textContent = message;
    toast.style.display = 'block';
    toast.style.opacity = '1';

    window.clearTimeout(showRealtimeToast.timeoutId);
    showRealtimeToast.timeoutId = window.setTimeout(() => {
        toast.style.display = 'none';
    }, 3200);
}

function getRealtimeMessage(event) {
    if (event?.type === 'tableChanged') return 'So do ban vua duoc cap nhat realtime.';
    if (event?.type === 'reservationChanged') return 'Co thay doi moi ve dat ban.';
    if (event?.type === 'orderChanged') return 'Co thay doi moi ve don hang lien quan den ban.';
    return 'Du lieu vua duoc dong bo realtime.';
}

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        reservationForm: document.getElementById('reservationForm'),
        dateInput: document.getElementById('b-date'),
        dateError: document.getElementById('b-date-error'),
        timeInput: document.getElementById('b-time'),
        timeError: document.getElementById('b-time-error'),
        guestsInput: document.getElementById('b-guests'),
        guestsError: document.getElementById('b-guests-error'),
        nameInput: document.getElementById('b-name'),
        nameError: document.getElementById('b-name-error'),
        phoneInput: document.getElementById('b-phone'),
        phoneError: document.getElementById('b-phone-error'),
        prefInput: document.getElementById('b-preference'),
        actionBtn: document.getElementById('bookingActionBtn'),
        mapSection: document.getElementById('mapSection'),
        tableLayout: document.getElementById('standaloneTableLayout'),
        confirmBtn: document.getElementById('confirmTableBtn'),
        bookingModal: document.getElementById('bookingModal'),
        bookingMsg: document.getElementById('bookingMsg'),
        aiTableSection: document.getElementById('aiTableSection'),
        aiTableSummary: document.getElementById('aiTableSummary'),
        aiTableList: document.getElementById('aiTableList')
    };

    if (elements.dateInput) {
        const today = new Date().toISOString().split('T')[0];
        elements.dateInput.setAttribute('min', today);
        elements.dateInput.value = today;
    }

    // Real-time validation for all fields
    elements.nameInput.addEventListener('input', function() {
        const isValid = this.value.length === 0 || validateName(this.value);
        elements.nameError.style.display = isValid ? 'none' : 'block';
    });

    elements.nameInput.addEventListener('blur', function() {
        if (this.value.trim().length > 0 && !validateName(this.value)) {
            elements.nameError.style.display = 'block';
            this.focus();
        }
    });

    elements.dateInput.addEventListener('change', function() {
        const isValid = this.value === '' || validateDate(this.value);
        elements.dateError.style.display = isValid ? 'none' : 'block';
    });

    elements.timeInput.addEventListener('change', function() {
        const isValid = validateTime(this.value);
        elements.timeError.style.display = isValid ? 'none' : 'block';
    });

    elements.guestsInput.addEventListener('change', function() {
        const isValid = validateGuests(this.value);
        elements.guestsError.style.display = isValid ? 'none' : 'block';
    });

    elements.phoneInput.addEventListener('input', function() {
        const phone = this.value.trim();
        if (phone.length === 0) {
            elements.phoneError.style.display = 'none';
            return;
        }
        
        if (!validateVietnamesePhone(phone)) {
            elements.phoneError.style.display = 'block';
        } else {
            elements.phoneError.style.display = 'none';
        }
    });

    elements.phoneInput.addEventListener('blur', function() {
        const phone = this.value.trim();
        if (phone.length > 0 && !validateVietnamesePhone(phone)) {
            elements.phoneInput.focus();
        }
    });

    loadAndRenderAllTablesDimmed();

    async function loadAndRenderAllTablesDimmed() {
        try {
            const tables = await loadTables();
            renderTableMap(tables, {}, true); // dimmed = true
        } catch (_) {
            elements.tableLayout.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--color-text-muted);">Đang tải sơ đồ bàn...</div>';
        }
    }

    async function refreshTableMapRealtime() {
        if (realtimeReloadTimeoutId) {
            window.clearTimeout(realtimeReloadTimeoutId);
        }

        realtimeReloadTimeoutId = window.setTimeout(async () => {
            if (pendingBookingData) {
                const [tables, statuses] = await Promise.all([loadTables(), getTableStatuses()]);
                renderTableMap(tables, statuses, false);
                await loadTableRecommendations();
                return;
            }

            await loadAndRenderAllTablesDimmed();
        }, 200);
    }

    function renderTableMap(tables, statuses, dimmed = false) {
        elements.tableLayout.innerHTML = '';
        const requiredGuests = Number(pendingBookingData?.guests || 0);

        const zones = {};
        tables.forEach(t => {
            if (!zones[t.zone || 'Khu chung']) zones[t.zone || 'Khu chung'] = [];
            zones[t.zone || 'Khu chung'].push(t);
        });

        for (const [zoneName, zoneTables] of Object.entries(zones)) {
            const zoneDiv = document.createElement('div');
            zoneDiv.className = 'layout-zone';

            const title = document.createElement('div');
            title.className = 'zone-title';
            title.textContent = zoneName;
            zoneDiv.appendChild(title);

            zoneTables.forEach(t => {
                const capacity = t.capacity || 4;
                let sizeClass = 'tbl-4';
                if (capacity <= 2) sizeClass = 'tbl-2';
                else if (capacity >= 8) sizeClass = 'tbl-vip';
                else if (capacity >= 6) sizeClass = 'tbl-6';

                const tbl = document.createElement('div');
                const status = statuses[t.id] || t.status || 'Trống';
                const canFit = requiredGuests <= 0 || capacity >= requiredGuests;
                const isAvailable = !dimmed && status === 'Trống' && canFit;

                tbl.className = `tbl ${sizeClass}`;
                if (isAvailable) tbl.classList.add('available');
                else if (dimmed) tbl.classList.add('dimmed');
                else tbl.classList.add('occupied');

                if ((t.zone || '').toLowerCase().includes('vip') || capacity >= 8) tbl.classList.add('tbl-vip');
                tbl.id = `table-${String(t.id).replace(/\s+/g, '-')}`;
                tbl.dataset.tableId = String(t.id);

                if (isAvailable) {
                    tbl.addEventListener('click', function () {
                        if (!this.classList.contains('available')) return;
                        document.querySelectorAll('.tbl').forEach(el => el.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedTableId = t.id;
                        elements.confirmBtn.disabled = false;
                    });
                }

                tbl.innerHTML = `${t.name || t.id} <span>${capacity} ghế</span>`;
                zoneDiv.appendChild(tbl);
            });

            elements.tableLayout.appendChild(zoneDiv);
        }
    }

    async function apiFetch(url, options = {}) {
        const resp = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body.message || `API ${resp.status}`);
        }
        if (resp.status === 204) return null;
        return resp.json();
    }

    async function loadTables() {
        try {
            const resp = await apiFetch(`${TABLES_URL}?page=1&pageSize=200&sortBy=id&sortOrder=asc`);
            return resp?.items || [];
        } catch (err) {
            console.warn('API không khả dụng, dùng cache:', err.message);
            return JSON.parse(localStorage.getItem('bistro_tables') || '[]');
        }
    }

    async function getTableStatuses() {
        try {
            const tablesResp = await apiFetch(`${TABLES_URL}?page=1&pageSize=200&sortBy=id&sortOrder=asc`);
            const tables = tablesResp?.items || [];
            const statuses = {};

            const normalizeStatus = (s) => {
                if (!s) return 'Trống';
                const v = String(s).toLowerCase();
                if (v === 'available' || v === 'trống') return 'Trống';
                if (v === 'occupied' || v === 'đang phục vụ') return 'Đang phục vụ';
                if (v === 'reserved' || v === 'đã đặt') return 'Đã đặt';
                if (v === 'cleaning' || v === 'chờ dọn dẹp') return 'Chờ dọn dẹp';
                return s;
            };

            tables.forEach(t => {
                statuses[t.id] = normalizeStatus(t.status);
            });
            return statuses;
        } catch (err) {
            console.warn('getTableStatuses FAILED:', err.message);
            return {};
        }
    }

    async function updateTableStatus(tableId, status) {
        try {
            await apiFetch(`${TABLES_URL}/${encodeURIComponent(tableId)}`, {
                method: 'PUT',
                body: JSON.stringify({ status: status })
            });
        } catch (err) {
            console.warn('Không thể cập nhật trạng thái bàn lên API:', err.message);
        }
    }

    async function saveReservation(data, customerId) {
        try {
            const payload = {
                customerId: customerId,
                tableId: selectedTableId,
                reservationDate: data.date,
                reservationTime: data.time + ':00',
                guestCount: parseInt(data.guests) || 2,
                status: 'Đã xác nhận',
                notes: data.preference || ''
            };
            await apiFetch(RESERVATIONS_URL, { method: 'POST', body: JSON.stringify(payload) });
            upsertLocalReservation(payload);
            return payload;
        } catch (err) {
            console.warn('Lưu reservation cục bộ:', err.message);
            const fallback = {
                id: Date.now(),
                customerId: customerId,
                tableId: selectedTableId,
                reservationDate: data.date,
                reservationTime: data.time + ':00',
                guestCount: parseInt(data.guests) || 2,
                status: 'Đã xác nhận',
                notes: data.preference || ''
            };
            upsertLocalReservation(fallback);
            return fallback;
        }
    }

    async function saveCustomer(name, phone) {
        try {
            const existing = await apiFetch(`${CUSTOMERS_URL}?searchTerm=${encodeURIComponent(phone)}&page=1&pageSize=1`);
            if (existing?.items?.length > 0) {
                const cust = existing.items[0];
                cust.visits = (cust.visits || 0) + 1;
                cust.totalSpent = cust.totalSpent || 0;
                if (cust.visits >= 10) cust.tier = 'platinum';
                else if (cust.visits >= 5) cust.tier = 'gold';
                else if (cust.visits >= 2) cust.tier = 'silver';
                await apiFetch(`${CUSTOMERS_URL}/${encodeURIComponent(cust.id)}`, { method: 'PUT', body: JSON.stringify(cust) });
                return cust;
            }
            const newCust = { id: `KH${Date.now().toString(36).toUpperCase()}`, fullName: name, phone, tier: 'new', visits: 1, totalSpent: 0 };
            await apiFetch(CUSTOMERS_URL, { method: 'POST', body: JSON.stringify(newCust) });
            return newCust;
        } catch (err) {
            console.warn('Lưu customer cục bộ:', err.message);
            let customers = JSON.parse(localStorage.getItem('bistro_customers') || '[]');
            let cust = customers.find(c => c.phone === phone);
            if (cust) { cust.visits = (cust.visits || 0) + 1; }
            else { cust = { id: `KH${Date.now().toString(36).toUpperCase()}`, name, phone, tier: 'new', visits: 1 }; customers.push(cust); }
            localStorage.setItem('bistro_customers', JSON.stringify(customers));
            return cust;
        }
    }

    function renderTableRecommendations(data) {
        if (!elements.aiTableSection || !elements.aiTableList || !elements.aiTableSummary) return;

        const tables = data?.tables || [];
        elements.aiTableSection.style.display = 'block';
        elements.aiTableSummary.textContent = data?.summary || 'AI đang đề xuất các bàn phù hợp nhất.';

        if (tables.length === 0) {
            elements.aiTableList.innerHTML = '<div class="body-text">Không có bàn phù hợp để gợi ý thêm.</div>';
            return;
        }

        elements.aiTableList.innerHTML = tables.map(table => `
            <div class="ai-table-card">
                <h4>${table.name || `Bàn ${table.tableId}`}</h4>
                <div class="ai-table-meta">
                    <span>${table.zone || 'Khu chung'}</span>
                    <span>${table.capacity || 0} ghế</span>
                    <span>${(table.provider || data.provider || 'AI').toUpperCase()}</span>
                </div>
                <p>${table.reason || 'Phù hợp với yêu cầu hiện tại.'}</p>
                <button type="button" class="btn btn-primary ai-select-table-btn" data-table-id="${table.tableId}">Chọn bàn này</button>
            </div>
        `).join('');

        elements.aiTableList.querySelectorAll('.ai-select-table-btn').forEach(button => {
            button.addEventListener('click', () => {
                selectTable(button.dataset.tableId);
            });
        });
    }

    function selectTable(tableId) {
        const targetId = String(tableId);
        const tableElement = elements.tableLayout.querySelector(`.tbl[data-table-id="${targetId}"]`);
        if (!tableElement || !tableElement.classList.contains('available')) return;

        elements.tableLayout.querySelectorAll('.tbl').forEach(el => el.classList.remove('selected'));
        tableElement.classList.add('selected');
        selectedTableId = Number.isNaN(Number(targetId)) ? targetId : Number(targetId);
        elements.confirmBtn.disabled = false;
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function loadTableRecommendations() {
        if (!pendingBookingData) return;

        if (elements.aiTableSection) elements.aiTableSection.style.display = 'block';
        if (elements.aiTableSummary) {
            elements.aiTableSummary.textContent = 'AI đang phân tích sức chứa, trạng thái bàn và ghi chú của bạn...';
        }
        if (elements.aiTableList) {
            elements.aiTableList.innerHTML = '<div class="body-text">Đang tạo gợi ý bàn...</div>';
        }

        try {
            const response = await apiFetch(`${AI_RECOMMENDATIONS_URL}/tables`, {
                method: 'POST',
                body: JSON.stringify({
                    reservationDate: pendingBookingData.date,
                    reservationTime: pendingBookingData.time,
                    guestCount: Number(pendingBookingData.guests || 1),
                    customerName: pendingBookingData.name,
                    preference: pendingBookingData.preference,
                    maxResults: 3
                })
            });
            renderTableRecommendations(response);
        } catch (err) {
            console.warn('Không thể tải gợi ý bàn AI:', err.message);
            if (elements.aiTableSummary) {
                elements.aiTableSummary.textContent = 'Không tải được gợi ý AI, bạn vẫn có thể chọn bàn trống trực tiếp bên dưới.';
            }
            if (elements.aiTableList) {
                elements.aiTableList.innerHTML = '';
            }
        }
    }

    elements.reservationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate all fields
        const name = elements.nameInput.value.trim();
        const date = elements.dateInput.value;
        const time = elements.timeInput.value;
        const guests = elements.guestsInput.value;
        const phone = elements.phoneInput.value.trim();

        let hasError = false;

        // Validate name
        if (!validateName(name)) {
            elements.nameError.style.display = 'block';
            hasError = true;
        } else {
            elements.nameError.style.display = 'none';
        }

        // Validate date
        if (!validateDate(date)) {
            elements.dateError.style.display = 'block';
            hasError = true;
        } else {
            elements.dateError.style.display = 'none';
        }

        // Validate time
        if (!validateTime(time)) {
            elements.timeError.style.display = 'block';
            hasError = true;
        } else {
            elements.timeError.style.display = 'none';
        }

        // Validate guests
        if (!validateGuests(guests)) {
            elements.guestsError.style.display = 'block';
            hasError = true;
        } else {
            elements.guestsError.style.display = 'none';
        }

        // Validate phone
        if (!validateVietnamesePhone(phone)) {
            elements.phoneError.style.display = 'block';
            hasError = true;
        } else {
            elements.phoneError.style.display = 'none';
        }

        if (hasError) {
            return;
        }

        pendingBookingData = {
            name: name,
            phone: phone,
            date: date,
            time: time,
            guests: guests,
            preference: elements.prefInput.value || 'Không có'
        };

        elements.actionBtn.innerText = 'Đang kiểm tra...';
        elements.actionBtn.disabled = true;

        const [tables, statuses] = await Promise.all([loadTables(), getTableStatuses()]);

        elements.actionBtn.innerText = 'Kéo xuống để chọn bàn';
        elements.actionBtn.disabled = false;
        elements.confirmBtn.disabled = true;
        selectedTableId = null;

        renderTableMap(tables, statuses, false);
        await loadTableRecommendations();

        elements.mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    elements.confirmBtn.addEventListener('click', async () => {
        if (!selectedTableId || !pendingBookingData) return;

        elements.confirmBtn.innerText = 'Đang xử lý...';
        elements.confirmBtn.disabled = true;

        const { name, phone, date, time } = pendingBookingData;
        const [year, month, day] = date.split('-');
        const formattedDate = `${day}/${month}/${year}`;

        try {
            const customer = await saveCustomer(name, phone);
            await saveReservation(pendingBookingData, customer.id);
            await updateTableStatus(selectedTableId, 'Đã đặt');

            sessionStorage.setItem('customerName', name);
            sessionStorage.setItem('bookedCustomerId', customer.id);
            sessionStorage.setItem('bookedTable', selectedTableId);
        } catch (err) {
            console.warn('Một phần lưu thất bại:', err.message);
            await updateTableStatus(selectedTableId, 'Đã đặt');
        }

        elements.bookingMsg.innerHTML = `Cảm ơn quý khách <b>${name}</b>.<br/>Vị trí <b>${selectedTableId}</b> vào lúc <b>${time}</b> ngày <b>${formattedDate}</b> đã được đặt thành công.`;
        elements.bookingModal.classList.add('active');

        elements.reservationForm.reset();
        elements.confirmBtn.innerText = 'Hoàn Tất Đặt Bàn';
        elements.confirmBtn.disabled = false;
        selectedTableId = null;
        pendingBookingData = null;
        document.querySelectorAll('.tbl').forEach(t => t.classList.remove('selected'));
        elements.actionBtn.innerText = 'Kiểm Tra Bàn Trống';
        elements.mapSection.classList.remove('active');
    });

    window.RestaurantRealtime?.connect?.({
        onConnectionStateChange: updateRealtimeBadge,
        onAnyChange: (event) => {
            refreshTableMapRealtime();
            showRealtimeToast(getRealtimeMessage(event));
        }
    });
});

window.closeBookingModal = function () {
    document.getElementById('bookingModal').classList.remove('active');
    window.location.href = './index.html';
};
