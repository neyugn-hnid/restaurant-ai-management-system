const API_BASE = 'http://localhost:7071/api';
const TABLES_URL = `${API_BASE}/RestaurantTables`;
const RESERVATIONS_URL = `${API_BASE}/Reservations`;
const CUSTOMERS_URL = `${API_BASE}/Customers`;

let pendingBookingData = null;
let selectedTableId = null;

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        reservationForm: document.getElementById('reservationForm'),
        dateInput: document.getElementById('b-date'),
        timeInput: document.getElementById('b-time'),
        guestsInput: document.getElementById('b-guests'),
        nameInput: document.getElementById('b-name'),
        phoneInput: document.getElementById('b-phone'),
        prefInput: document.getElementById('b-preference'),
        actionBtn: document.getElementById('bookingActionBtn'),
        mapSection: document.getElementById('mapSection'),
        tableLayout: document.getElementById('standaloneTableLayout'),
        confirmBtn: document.getElementById('confirmTableBtn'),
        bookingModal: document.getElementById('bookingModal'),
        bookingMsg: document.getElementById('bookingMsg')
    };

    if (elements.dateInput) {
        const today = new Date().toISOString().split('T')[0];
        elements.dateInput.setAttribute('min', today);
        elements.dateInput.value = today;
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
            const tables = resp?.items || [];
            localStorage.setItem('bistro_tables', JSON.stringify(tables));
            return tables;
        } catch (err) {
            console.warn('API không khả dụng, dùng cache:', err.message);
            return JSON.parse(localStorage.getItem('bistro_tables') || '[]');
        }
    }

    async function getTableStatuses() {
        try {
            const [tablesResp, reservationsResp] = await Promise.all([
                apiFetch(`${TABLES_URL}?page=1&pageSize=200&sortBy=id&sortOrder=asc`),
                apiFetch(`${RESERVATIONS_URL}?page=1&pageSize=500`)
            ]);

            const tables = tablesResp?.items || [];
            const reservations = reservationsResp?.items || [];
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
                const hasActiveReservation = reservations.some(r =>
                    String(r.tableId) === String(t.id) &&
                    (r.status === 'Đã xác nhận' || r.status === 'Chờ xử lý')
                );
                const tableStatus = normalizeStatus(t.status);
                statuses[t.id] = hasActiveReservation ? 'Đã đặt' : tableStatus;
            });

            localStorage.setItem('bistro_table_statuses', JSON.stringify(statuses));
            return statuses;
        } catch (err) {
            console.warn('Dùng cache table statuses:', err.message);
            return JSON.parse(localStorage.getItem('bistro_table_statuses') || '{}');
        }
    }

    async function updateTableStatus(tableId, status) {
        try {
            const tables = JSON.parse(localStorage.getItem('bistro_tables') || '[]');
            const table = tables.find(t => String(t.id) === String(tableId));
            if (table) {
                const payload = { ...table, status: status, updatedAt: new Date().toISOString() };
                await apiFetch(`${TABLES_URL}/${encodeURIComponent(tableId)}`, {
                    method: 'PUT', body: JSON.stringify(payload)
                });
            }
        } catch (err) {
            console.warn('Không thể cập nhật trạng thái bàn lên API:', err.message);
        }
        const statuses = JSON.parse(localStorage.getItem('bistro_table_statuses') || '{}');
        statuses[tableId] = status;
        localStorage.setItem('bistro_table_statuses', JSON.stringify(statuses));
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
            let reservations = JSON.parse(localStorage.getItem('bistro_reservations') || '[]');
            reservations.push(fallback);
            localStorage.setItem('bistro_reservations', JSON.stringify(reservations));
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

    elements.reservationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!elements.reservationForm.checkValidity()) {
            elements.reservationForm.reportValidity();
            return;
        }

        pendingBookingData = {
            name: elements.nameInput.value,
            phone: elements.phoneInput.value,
            date: elements.dateInput.value,
            time: elements.timeInput.value,
            guests: elements.guestsInput.value,
            preference: elements.prefInput.value || 'Không có'
        };

        elements.actionBtn.innerText = 'Đang kiểm tra...';
        elements.actionBtn.disabled = true;

        const [tables, statuses] = await Promise.all([loadTables(), getTableStatuses()]);

        elements.actionBtn.innerText = 'Kéo xuống để chọn bàn';
        elements.actionBtn.disabled = false;
        elements.mapSection.classList.add('active');
        elements.tableLayout.innerHTML = '';

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

            const availableTables = zoneTables.filter(t => {
                const status = statuses[t.id] || t.status || 'Trống';
                return status === 'Trống';
            });

            if (availableTables.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'width:100%;text-align:center;padding:2rem;color:var(--color-text-muted);font-size:1.4rem;';
                empty.textContent = 'Không có bàn trống trong khu vực này';
                zoneDiv.appendChild(empty);
            }

            availableTables.forEach(t => {
                const capacity = t.capacity || 4;
                let sizeClass = 'tbl-4';
                if (capacity <= 2) sizeClass = 'tbl-2';
                else if (capacity >= 8) sizeClass = 'tbl-vip';
                else if (capacity >= 6) sizeClass = 'tbl-6';

                const tbl = document.createElement('div');
                tbl.className = `tbl ${sizeClass} available`;
                if ((t.zone || '').toLowerCase().includes('vip') || capacity >= 8) tbl.classList.add('tbl-vip');
                tbl.id = `table-${String(t.id).replace(/\s+/g, '-')}`;

                tbl.addEventListener('click', function () {
                    if (!this.classList.contains('available')) return;
                    document.querySelectorAll('.tbl').forEach(el => el.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedTableId = t.id;
                    elements.confirmBtn.disabled = false;
                });

                tbl.innerHTML = `${t.id} <span>${capacity} ghế</span>`;
                zoneDiv.appendChild(tbl);
            });

            elements.tableLayout.appendChild(zoneDiv);
        }

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
            sessionStorage.setItem('bookedTable', selectedTableId);
        } catch (err) {
            console.warn('Một phần lưu thất bại:', err.message);
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
});

window.closeBookingModal = function () {
    document.getElementById('bookingModal').classList.remove('active');
    window.location.href = './index.html';
};
