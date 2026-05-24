const API_BASE = 'http://localhost:7071/api';
const TABLES_URL = `${API_BASE}/RestaurantTables`;
const RESERVATIONS_URL = `${API_BASE}/Reservations`;
const CUSTOMERS_URL = `${API_BASE}/Customers`;
const AI_RECOMMENDATIONS_URL = `${API_BASE}/AiRecommendations`;

let pendingBookingData = null;
let selectedTableId = null;
let realtimeReloadTimeoutId = null;
let latestAiRecommendations = [];
let latestSuggestedTableId = null;

function upsertLocalReservation(reservation) {
    const reservations = JSON.parse(localStorage.getItem('bistro_reservations') || '[]');
    const nextReservations = reservations.filter(item => String(item.tableId) !== String(reservation.tableId));
    nextReservations.unshift(reservation);
    localStorage.setItem('bistro_reservations', JSON.stringify(nextReservations));
}

function validateVietnamesePhone(phone) {
    const mobilePattern = /^0[35789]\d{8}$/;
    const landlinePattern = /^02\d{8,10}$/;
    return mobilePattern.test(phone) || landlinePattern.test(phone);
}

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
    const num = parseInt(guests, 10);
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
    toast.style.display = 'flex';
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

function formatDisplayDate(date) {
    if (!date) return '--';
    const [year, month, day] = date.split('-');
    if (!year || !month || !day) return date;
    return `${day}/${month}/${year}`;
}

function getRecommendationScore(table, index = 0) {
    let raw = 0;
    if (typeof table?.score === 'number') raw = table.score;
    else if (typeof table?.matchScore === 'number') raw = table.matchScore;
    else raw = Math.max(88 - index * 4, 72);
    return Math.min(Math.round(raw), 100);
}

function getRecommendationTags(table, pendingData) {
    const tags = ['Đề xuất tốt nhất'];
    const reason = String(table?.reason || '').toLowerCase();
    const zone = String(table?.zone || '').toLowerCase();
    const note = String(pendingData?.preference || '').toLowerCase();
    const capacity = Number(table?.capacity || 0);
    const guests = Number(pendingData?.guests || 0);

    if (reason.includes('cửa sổ') || note.includes('cửa sổ')) tags.push('Gần cửa sổ');
    if (reason.includes('yên tĩnh') || note.includes('yên tĩnh') || zone.includes('vip')) tags.push('Yên tĩnh');
    if (zone.includes('sân') || zone.includes('vườn')) tags.push('Không gian thoáng');
    if (guests > 0 && capacity > 0 && guests <= 4 && capacity <= 4) tags.push('Phù hợp nhóm nhỏ');
    if (guests >= 6 || capacity >= 6) tags.push('Hợp nhóm đông');

    return [...new Set(tags)].slice(0, 4);
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
        tableLayout: document.getElementById('standaloneTableLayout'),
        confirmBtn: document.getElementById('confirmTableBtn'),
        availableCount: document.getElementById('availableCount'),
        occupiedCount: document.getElementById('occupiedCount'),
        suggestedCount: document.getElementById('suggestedCount'),
        selectedTableText: document.getElementById('selectedTableText'),
        selectedTableHint: document.getElementById('selectedTableHint'),
        selectedZoneText: document.getElementById('selectedZoneText'),
        selectedCapacityText: document.getElementById('selectedCapacityText'),
        selectedScoreText: document.getElementById('selectedScoreText'),
        confirmSummaryText: document.getElementById('confirmSummaryText'),
        confirmSummaryHint: document.getElementById('confirmSummaryHint'),
        summaryDate: document.getElementById('summaryDate'),
        summaryTime: document.getElementById('summaryTime'),
        summaryGuests: document.getElementById('summaryGuests'),
        summaryName: document.getElementById('summaryName'),
        summaryPhone: document.getElementById('summaryPhone'),
        summaryPreference: document.getElementById('summaryPreference'),
        bookingModal: document.getElementById('bookingModal'),
        bookingMsg: document.getElementById('bookingMsg'),
        aiTableSection: document.getElementById('aiTableSection'),
        aiTableSummary: document.getElementById('aiTableSummary'),
        aiTableList: document.getElementById('aiTableList'),
        aiSpotlightCard: document.getElementById('aiSpotlightCard'),
        aiBestScore: document.getElementById('aiBestScore'),
        aiBestTableName: document.getElementById('aiBestTableName'),
        aiBestZone: document.getElementById('aiBestZone'),
        aiBestCapacity: document.getElementById('aiBestCapacity'),
        aiBestFeature: document.getElementById('aiBestFeature'),
        aiBestReason: document.getElementById('aiBestReason'),
        aiBestTags: document.getElementById('aiBestTags'),
        aiBestReasonList: document.getElementById('aiBestReasonList'),
        aiBestSelectBtn: document.getElementById('aiBestSelectBtn'),
        aiSuggestCount: document.getElementById('aiSuggestCount'),
        aiBestZoneShort: document.getElementById('aiBestZoneShort')
    };

    function updateBookingSummary() {
        const date = elements.dateInput.value;
        const time = elements.timeInput.value;
        const guests = elements.guestsInput.value;
        const name = elements.nameInput.value.trim();
        const phone = elements.phoneInput.value.trim();
        const preference = elements.prefInput.value.trim();

        if (elements.summaryDate) elements.summaryDate.textContent = formatDisplayDate(date);
        if (elements.summaryTime) elements.summaryTime.textContent = time || '--';
        if (elements.summaryGuests) elements.summaryGuests.textContent = guests ? `${guests} khách` : '--';
        if (elements.summaryName) elements.summaryName.textContent = name || '--';
        if (elements.summaryPhone) elements.summaryPhone.textContent = phone || '--';
        if (elements.summaryPreference) elements.summaryPreference.textContent = preference || '--';
    }

    function updateSelectionSummary(table = null) {
        const recommendation = latestAiRecommendations.find(item => String(item.tableId || item.id) === String(table?.id || table?.tableId || selectedTableId));
        const score = recommendation ? getRecommendationScore(recommendation, latestAiRecommendations.indexOf(recommendation)) : null;

        if (!table) {
            if (elements.selectedTableText) elements.selectedTableText.textContent = 'Chưa chọn bàn';
            if (elements.selectedTableHint) elements.selectedTableHint.textContent = 'Hoàn tất biểu mẫu rồi chọn một bàn trống trên sơ đồ.';
            if (elements.selectedZoneText) elements.selectedZoneText.textContent = '--';
            if (elements.selectedCapacityText) elements.selectedCapacityText.textContent = '--';
            if (elements.selectedScoreText) elements.selectedScoreText.textContent = '--%';
            if (elements.confirmSummaryText) elements.confirmSummaryText.textContent = 'Chưa có bàn nào được chọn';
            if (elements.confirmSummaryHint) elements.confirmSummaryHint.textContent = 'Bàn phù hợp sẽ được kích hoạt sau khi bạn kiểm tra tình trạng trống.';
            return;
        }

        const zone = table.zone || 'Khu chung';
        const capacity = table.capacity || 0;
        const label = `${table.name || `Bàn ${table.id}`}`;
        const hint = `Khu ${zone}${pendingBookingData ? `, phù hợp cho nhóm ${pendingBookingData.guests} khách.` : '.'}`;

        if (elements.selectedTableText) elements.selectedTableText.textContent = label;
        if (elements.selectedTableHint) elements.selectedTableHint.textContent = hint;
        if (elements.selectedZoneText) elements.selectedZoneText.textContent = zone;
        if (elements.selectedCapacityText) elements.selectedCapacityText.textContent = `${capacity} ghế`;
        if (elements.selectedScoreText) elements.selectedScoreText.textContent = score ? `${score}%` : '--%';
        if (elements.confirmSummaryText) elements.confirmSummaryText.textContent = `Đã chọn ${label}`;
        if (elements.confirmSummaryHint) elements.confirmSummaryHint.textContent = `${zone} • ${capacity} ghế${score ? ` • AI ${score}%` : ''}`;
    }

    function renderAiSpotlight(bestTable) {
        if (!elements.aiBestTableName) return;

        if (!bestTable) {
            elements.aiBestScore.textContent = '--';
            elements.aiBestTableName.textContent = 'Đang chờ gợi ý';
            elements.aiBestZone.textContent = 'Khu vực';
            elements.aiBestCapacity.textContent = '0 ghế';
            elements.aiBestFeature.textContent = '--';
            elements.aiBestReason.textContent = 'Hoàn tất thông tin để nhận gợi ý bàn phù hợp nhất từ AI.';
            elements.aiBestTags.innerHTML = '<span class="ai-chip">Đề xuất tốt nhất</span>';
            elements.aiBestReasonList.innerHTML = `
                <div class="ai-reason-item">Phù hợp số lượng khách</div>
                <div class="ai-reason-item">Đúng khung giờ</div>
            `;
            elements.aiBestSelectBtn.disabled = true;
            elements.aiBestSelectBtn.dataset.tableId = '';
            elements.aiSuggestCount.textContent = '0';
            elements.aiBestZoneShort.textContent = '--';
            return;
        }

        const score = getRecommendationScore(bestTable, 0);
        const tags = getRecommendationTags(bestTable, pendingBookingData);
        const reasonBullets = [
            'Phù hợp số lượng khách',
            bestTable.reason || 'Trống trong khung giờ đã chọn',
            pendingBookingData?.preference ? `Khớp ghi chú: ${pendingBookingData.preference}` : 'Ưu tiên trải nghiệm cân bằng'
        ];

        elements.aiBestScore.textContent = String(score);
        elements.aiBestTableName.textContent = bestTable.name || `Bàn ${bestTable.tableId}`;
        elements.aiBestZone.textContent = bestTable.zone || 'Khu chung';
        elements.aiBestCapacity.textContent = `${bestTable.capacity || 0} ghế`;
        elements.aiBestFeature.textContent = tags[1] || tags[0] || 'Gợi ý AI';
        elements.aiBestReason.textContent = bestTable.reason || 'AI đánh giá đây là bàn phù hợp nhất với thời gian và quy mô nhóm hiện tại.';
        elements.aiBestTags.innerHTML = tags.map(tag => `<span class="ai-chip">${tag}</span>`).join('');
        elements.aiBestReasonList.innerHTML = reasonBullets.slice(0, 2).map(item => `<div class="ai-reason-item">${item}</div>`).join('');
        elements.aiBestSelectBtn.disabled = false;
        elements.aiBestSelectBtn.dataset.tableId = String(bestTable.tableId);
        elements.aiSuggestCount.textContent = String(latestAiRecommendations.length);
        elements.aiBestZoneShort.textContent = bestTable.zone || '--';
    }

    function getAiSuggestedIds() {
        return latestAiRecommendations.map(table => String(table.tableId || table.id));
    }

    updateSelectionSummary();
    updateBookingSummary();

    if (elements.dateInput) {
        const today = new Date().toISOString().split('T')[0];
        elements.dateInput.setAttribute('min', today);
        elements.dateInput.value = today;
    }

    [elements.dateInput, elements.timeInput, elements.guestsInput, elements.nameInput, elements.phoneInput, elements.prefInput].forEach(input => {
        input?.addEventListener('input', updateBookingSummary);
        input?.addEventListener('change', updateBookingSummary);
    });

    elements.aiBestSelectBtn?.addEventListener('click', () => {
        if (elements.aiBestSelectBtn.dataset.tableId) {
            selectTable(elements.aiBestSelectBtn.dataset.tableId);
        }
    });

    elements.nameInput.addEventListener('input', function () {
        const isValid = this.value.length === 0 || validateName(this.value);
        elements.nameError.style.display = isValid ? 'none' : 'block';
    });

    elements.nameInput.addEventListener('blur', function () {
        if (this.value.trim().length > 0 && !validateName(this.value)) {
            elements.nameError.style.display = 'block';
            this.focus();
        }
    });

    elements.dateInput.addEventListener('change', function () {
        const isValid = this.value === '' || validateDate(this.value);
        elements.dateError.style.display = isValid ? 'none' : 'block';
    });

    elements.timeInput.addEventListener('change', function () {
        const isValid = validateTime(this.value);
        elements.timeError.style.display = isValid ? 'none' : 'block';
    });

    elements.guestsInput.addEventListener('change', function () {
        const isValid = validateGuests(this.value);
        elements.guestsError.style.display = isValid ? 'none' : 'block';
    });

    elements.phoneInput.addEventListener('input', function () {
        const phone = this.value.trim();
        if (phone.length === 0) {
            elements.phoneError.style.display = 'none';
            return;
        }
        elements.phoneError.style.display = validateVietnamesePhone(phone) ? 'none' : 'block';
    });

    elements.phoneInput.addEventListener('blur', function () {
        const phone = this.value.trim();
        if (phone.length > 0 && !validateVietnamesePhone(phone)) {
            elements.phoneInput.focus();
        }
    });

    loadAndRenderAllTablesDimmed();

    async function loadAndRenderAllTablesDimmed() {
        try {
            const tables = await loadTables();
            renderTableMap(tables, {}, true);
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
        let availableCount = 0;
        let occupiedCount = 0;
        const suggestedIds = getAiSuggestedIds();

        const zones = {};
        tables.forEach(table => {
            const zoneName = table.zone || 'Khu chung';
            if (!zones[zoneName]) zones[zoneName] = [];
            zones[zoneName].push(table);
        });

        for (const [zoneName, zoneTables] of Object.entries(zones)) {
            const zoneDiv = document.createElement('div');
            zoneDiv.className = 'layout-zone';

            const title = document.createElement('div');
            title.className = 'zone-title';
            title.textContent = zoneName;
            zoneDiv.appendChild(title);

            zoneTables.forEach(table => {
                const capacity = table.capacity || 4;
                let sizeClass = 'tbl-4';
                if (capacity <= 2) sizeClass = 'tbl-2';
                else if (capacity >= 8) sizeClass = 'tbl-vip';
                else if (capacity >= 6) sizeClass = 'tbl-6';

                const tbl = document.createElement('div');
                const status = statuses[table.id] || table.status || 'Trống';
                const canFit = requiredGuests <= 0 || capacity >= requiredGuests;
                const isAvailable = !dimmed && status === 'Trống' && canFit;
                const isSuggested = suggestedIds.includes(String(table.id));

                if (isAvailable) availableCount += 1;
                else occupiedCount += 1;

                tbl.className = `tbl ${sizeClass}`;
                if (isAvailable) tbl.classList.add('available');
                else if (dimmed) tbl.classList.add('dimmed');
                else tbl.classList.add('occupied');

                if (isSuggested && isAvailable) tbl.classList.add('ai-suggest');
                if ((table.zone || '').toLowerCase().includes('vip') || capacity >= 8) tbl.classList.add('tbl-vip');

                tbl.id = `table-${String(table.id).replace(/\s+/g, '-')}`;
                tbl.dataset.tableId = String(table.id);

                if (isAvailable) {
                    tbl.addEventListener('click', function () {
                        if (!this.classList.contains('available')) return;
                        elements.tableLayout.querySelectorAll('.tbl').forEach(el => el.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedTableId = table.id;
                        elements.confirmBtn.disabled = false;
                        showTableDetailModal(table);
                    });
                }

                tbl.innerHTML = `${table.name || table.id} <span>${capacity} ghế</span>`;
                zoneDiv.appendChild(tbl);
            });

            elements.tableLayout.appendChild(zoneDiv);
        }

        if (elements.availableCount) elements.availableCount.textContent = String(availableCount);
        if (elements.occupiedCount) elements.occupiedCount.textContent = String(occupiedCount);
        if (elements.suggestedCount) elements.suggestedCount.textContent = String(suggestedIds.length);
    }

    function showTableDetailModal(table) {
        const recommendation = latestAiRecommendations.find(item => String(item.tableId || item.id) === String(table?.id || table?.tableId));
        const score = recommendation ? getRecommendationScore(recommendation, latestAiRecommendations.indexOf(recommendation)) : null;

        const zone = table.zone || 'Khu chung';
        const capacity = table.capacity || 0;
        const label = table.name || `Bàn ${table.id}`;

        document.getElementById('modalTableName').textContent = label;
        document.getElementById('modalZone').textContent = zone;
        document.getElementById('modalCapacity').textContent = `${capacity} ghế`;
        document.getElementById('modalScore').textContent = score ? `${score}%` : '--%';
        document.getElementById('modalDate').textContent = formatDisplayDate(pendingBookingData?.date);
        document.getElementById('modalTime').textContent = pendingBookingData?.time || '--';
        document.getElementById('modalGuests').textContent = pendingBookingData?.guests ? `${pendingBookingData.guests} khách` : '--';
        document.getElementById('modalName').textContent = pendingBookingData?.name || '--';
        document.getElementById('modalPhone').textContent = pendingBookingData?.phone || '--';
        document.getElementById('modalNote').textContent = pendingBookingData?.preference || '--';

        elements.confirmBtn.disabled = false;
        document.getElementById('tableDetailModal').classList.add('active');
    }

    window.closeTableDetailModal = function () {
        document.getElementById('tableDetailModal').classList.remove('active');
    };

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

            const normalizeStatus = (status) => {
                if (!status) return 'Trống';
                const value = String(status).toLowerCase();
                if (value === 'available' || value === 'trống') return 'Trống';
                if (value === 'occupied' || value === 'đang phục vụ') return 'Đang phục vụ';
                if (value === 'reserved' || value === 'đã đặt') return 'Đã đặt';
                if (value === 'cleaning' || value === 'chờ dọn dẹp') return 'Chờ dọn dẹp';
                return status;
            };

            tables.forEach(table => {
                statuses[table.id] = normalizeStatus(table.status);
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
                body: JSON.stringify({ status })
            });
        } catch (err) {
            console.warn('Không thể cập nhật trạng thái bàn lên API:', err.message);
        }
    }

    async function saveReservation(data, customerId) {
        try {
            const payload = {
                customerId,
                tableId: selectedTableId,
                reservationDate: data.date,
                reservationTime: `${data.time}:00`,
                guestCount: parseInt(data.guests, 10) || 2,
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
                customerId,
                tableId: selectedTableId,
                reservationDate: data.date,
                reservationTime: `${data.time}:00`,
                guestCount: parseInt(data.guests, 10) || 2,
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
                const customer = existing.items[0];
                customer.visits = (customer.visits || 0) + 1;
                customer.totalSpent = customer.totalSpent || 0;
                if (customer.visits >= 10) customer.tier = 'platinum';
                else if (customer.visits >= 5) customer.tier = 'gold';
                else if (customer.visits >= 2) customer.tier = 'silver';
                await apiFetch(`${CUSTOMERS_URL}/${encodeURIComponent(customer.id)}`, { method: 'PUT', body: JSON.stringify(customer) });
                return customer;
            }
            const newCustomer = { id: `KH${Date.now().toString(36).toUpperCase()}`, fullName: name, phone, tier: 'new', visits: 1, totalSpent: 0 };
            await apiFetch(CUSTOMERS_URL, { method: 'POST', body: JSON.stringify(newCustomer) });
            return newCustomer;
        } catch (err) {
            console.warn('Lưu customer cục bộ:', err.message);
            const customers = JSON.parse(localStorage.getItem('bistro_customers') || '[]');
            let customer = customers.find(item => item.phone === phone);
            if (customer) customer.visits = (customer.visits || 0) + 1;
            else {
                customer = { id: `KH${Date.now().toString(36).toUpperCase()}`, name, phone, tier: 'new', visits: 1 };
                customers.push(customer);
            }
            localStorage.setItem('bistro_customers', JSON.stringify(customers));
            return customer;
        }
    }

    async function renderTableRecommendations(data) {
        if (!elements.aiTableSection || !elements.aiTableList || !elements.aiTableSummary) return;

        let tables = data?.tables || [];

        // Filter: only show tables that are actually available (Trống)
        if (tables.length > 0) {
            try {
                const statuses = await getTableStatuses();
                tables = tables.filter(table => {
                    const id = String(table.tableId || table.id);
                    const status = statuses[id] || 'Trống';
                    return status === 'Trống';
                });
            } catch (_) {
                // If status check fails, show all recommendations
            }
        }

        latestAiRecommendations = tables;
        latestSuggestedTableId = tables[0]?.tableId ?? null;

        elements.aiTableSection.style.display = 'block';
        elements.aiTableSummary.textContent = data?.summary || 'AI đang đề xuất các bàn phù hợp nhất.';
        renderAiSpotlight(tables[0]);
        if (elements.suggestedCount) elements.suggestedCount.textContent = String(tables.length);

        if (tables.length === 0) {
            elements.aiTableList.innerHTML = '<div class="body-text">Không có bàn phù hợp để gợi ý thêm.</div>';
            return;
        }

        elements.aiTableList.innerHTML = tables.map((table, index) => {
            const score = getRecommendationScore(table, index);
            const tags = getRecommendationTags(table, pendingBookingData);
            return `
                <div class="ai-table-card ${index === 0 ? 'featured' : ''}">
                    <div class="ai-card-score">${score}%</div>
                    <h4>${table.name || `Bàn ${table.tableId}`}</h4>
                    <div class="ai-table-meta">
                        <span>${table.zone || 'Khu chung'}</span>
                        <span>${table.capacity || 0} ghế</span>
                        <span>${(table.provider || data.provider || 'AI').toUpperCase()}</span>
                    </div>
                    <p>${table.reason || 'Phù hợp với yêu cầu hiện tại.'}</p>
                    <div class="ai-card-chips">
                        ${tags.map(tag => `<span class="ai-chip">${tag}</span>`).join('')}
                    </div>
                    <button type="button" class="btn btn-primary ai-select-table-btn" data-table-id="${table.tableId}">Chọn bàn này</button>
                </div>
            `;
        }).join('');

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

        const matchedTable = {
            id: targetId,
            name: tableElement.childNodes[0]?.textContent?.trim() || `Bàn ${targetId}`,
            capacity: Number(tableElement.querySelector('span')?.textContent?.replace(/\D/g, '') || 0),
            zone: tableElement.closest('.layout-zone')?.querySelector('.zone-title')?.textContent?.trim() || 'Khu chung'
        };

        updateSelectionSummary(matchedTable);
        showTableDetailModal(matchedTable);
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    async function loadTableRecommendations() {
        if (!pendingBookingData) return;

        elements.aiTableSection.style.display = 'block';
        elements.aiTableSummary.textContent = 'AI đang phân tích sức chứa, trạng thái bàn và ghi chú của bạn...';
        elements.aiTableList.innerHTML = '<div class="body-text">Đang tạo gợi ý bàn...</div>';
        renderAiSpotlight(null);

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

            await renderTableRecommendations(response);
        } catch (err) {
            console.warn('Không thể tải gợi ý bàn AI:', err.message);
            latestAiRecommendations = [];
            latestSuggestedTableId = null;
            elements.aiTableSummary.textContent = 'Không tải được gợi ý AI, bạn vẫn có thể chọn bàn trống trực tiếp bên dưới.';
            elements.aiTableList.innerHTML = '';
            renderAiSpotlight(null);
            if (elements.suggestedCount) elements.suggestedCount.textContent = '0';
        }
    }

    elements.reservationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = elements.nameInput.value.trim();
        const date = elements.dateInput.value;
        const time = elements.timeInput.value;
        const guests = elements.guestsInput.value;
        const phone = elements.phoneInput.value.trim();

        let hasError = false;

        if (!validateName(name)) {
            elements.nameError.style.display = 'block';
            hasError = true;
        } else {
            elements.nameError.style.display = 'none';
        }

        if (!validateDate(date)) {
            elements.dateError.style.display = 'block';
            hasError = true;
        } else {
            elements.dateError.style.display = 'none';
        }

        if (!validateTime(time)) {
            elements.timeError.style.display = 'block';
            hasError = true;
        } else {
            elements.timeError.style.display = 'none';
        }

        if (!validateGuests(guests)) {
            elements.guestsError.style.display = 'block';
            hasError = true;
        } else {
            elements.guestsError.style.display = 'none';
        }

        if (!validateVietnamesePhone(phone)) {
            elements.phoneError.style.display = 'block';
            hasError = true;
        } else {
            elements.phoneError.style.display = 'none';
        }

        if (hasError) return;

        pendingBookingData = {
            name,
            phone,
            date,
            time,
            guests,
            preference: elements.prefInput.value || 'Không có'
        };

        updateBookingSummary();

        elements.actionBtn.innerText = 'Đang kiểm tra...';
        elements.actionBtn.disabled = true;

        const [tables, statuses] = await Promise.all([loadTables(), getTableStatuses()]);

        elements.actionBtn.innerText = 'Kiểm tra bàn trống';
        elements.actionBtn.disabled = false;
        elements.confirmBtn.disabled = true;
        selectedTableId = null;
        updateSelectionSummary();

        renderTableMap(tables, statuses, false);
        await loadTableRecommendations();

        document.getElementById('aiTableSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    elements.confirmBtn.addEventListener('click', async () => {
        if (!selectedTableId || !pendingBookingData) return;

        elements.confirmBtn.innerText = 'Đang xử lý...';
        elements.confirmBtn.disabled = true;

        const { name, phone, date, time } = pendingBookingData;
        const formattedDate = formatDisplayDate(date);

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
        document.getElementById('tableDetailModal').classList.remove('active');
        elements.bookingModal.classList.add('active');

        elements.reservationForm.reset();

        const today = new Date().toISOString().split('T')[0];
        elements.dateInput.value = today;
        elements.guestsInput.value = '4';

        elements.confirmBtn.innerText = 'Xác nhận đặt bàn';
        elements.confirmBtn.disabled = false;
        selectedTableId = null;
        pendingBookingData = null;
        latestAiRecommendations = [];
        latestSuggestedTableId = null;
        updateSelectionSummary();
        updateBookingSummary();
        renderAiSpotlight(null);
        if (elements.aiTableSummary) elements.aiTableSummary.textContent = 'Đang phân tích yêu cầu đặt bàn của bạn.';
        if (elements.aiTableList) elements.aiTableList.innerHTML = '';
        if (elements.suggestedCount) elements.suggestedCount.textContent = '0';
        document.querySelectorAll('.tbl').forEach(table => table.classList.remove('selected'));
        elements.actionBtn.innerText = 'Kiểm tra bàn trống';
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
