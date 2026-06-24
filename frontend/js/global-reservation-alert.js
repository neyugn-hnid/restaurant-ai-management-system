(function () {
    const SIGNALR_CDN = 'https://cdn.jsdelivr.net/npm/@microsoft/signalr@8.0.7/dist/browser/signalr.min.js';
    const REALTIME_CLIENT_PATH = './js/realtime-client.js';
    const API_BASE_URL = window.API_BASE_URL;
    const RESERVATIONS_API_URL = `${API_BASE_URL}/Reservations`;
    const MODAL_ID = 'globalReservationAlertModal';
    const SEEN_KEY = '__globalReservationSeen__';
    function ensureModalMarkup() {
        if (document.getElementById(MODAL_ID)) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-labelledby="${MODAL_ID}Label" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content rounded-4 border-0 shadow-lg">
                        <div class="modal-header border-bottom-0 pb-0">
                            <h5 class="modal-title fw-bold d-flex align-items-center gap-2" id="${MODAL_ID}Label">
                                <span class="material-symbols-outlined text-warning">notifications_active</span>
                                Đặt bàn mới
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body px-4 pb-4 pt-3">
                            <div class="p-3 bg-light rounded-4 mb-3">
                                <div class="small text-secondary mb-1">Khách hàng</div>
                                <div class="fw-semibold text-dark" data-field="customer">Đang tải...</div>
                            </div>
                            <div class="row g-3 mb-3">
                                <div class="col-6">
                                    <div class="p-3 bg-light rounded-4 h-100">
                                        <div class="small text-secondary mb-1">Bàn</div>
                                        <div class="fw-semibold text-dark" data-field="table">-</div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="p-3 bg-light rounded-4 h-100">
                                        <div class="small text-secondary mb-1">Số khách</div>
                                        <div class="fw-semibold text-dark" data-field="guests">-</div>
                                    </div>
                                </div>
                            </div>
                            <div class="p-3 border rounded-4">
                                <div class="small text-secondary mb-1">Thời gian đặt</div>
                                <div class="fw-semibold text-dark" data-field="time">-</div>
                            </div>
                        </div>
                        <div class="modal-footer border-top-0 pt-0">
                            <button type="button" class="btn btn-primary rounded-pill px-4 fw-medium" data-bs-dismiss="modal">Đã rõ</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    }
    function setField(name, value) {
        const modal = document.getElementById(MODAL_ID);
        if (!modal) return;
        const field = modal.querySelector(`[data-field="${name}"]`);
        if (field) field.textContent = value;
    }
    function playAlertSound() {
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
        } catch (_) {}
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
    async function request(url) {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        });
        if (!response.ok) {
            throw new Error(`API lỗi (${response.status})`);
        }
        if (response.status === 204) return null;
        return response.json();
    }
    async function fetchReservation(reservationId) {
        if (!reservationId) return null;
        try {
            return await request(`${RESERVATIONS_API_URL}/${encodeURIComponent(reservationId)}`);
        } catch (_) {
            return null;
        }
    }
    async function showReservationAlert(payload) {
        if (!window.bootstrap) return;
        if (payload?.action !== 'created') return;
        const reservationId = payload?.reservationId;
        const seenMap = window[SEEN_KEY] || (window[SEEN_KEY] = new Set());
        const seenToken = `created:${reservationId}`;
        if (reservationId && seenMap.has(seenToken)) return;
        if (reservationId) seenMap.add(seenToken);
        ensureModalMarkup();
        const reservation = await fetchReservation(reservationId);
        const customerName = reservation?.customerName || reservation?.CustomerName || 'Khách mới';
        const tableName = reservation?.tableName || reservation?.TableName || (payload?.tableId ? `Bàn ${payload.tableId}` : '-');
        const guestCount = reservation?.guestCount || reservation?.GuestCount || '-';
        const bookingTime = reservation ? formatReservationDateTime(reservation) : 'Vừa đặt xong';
        setField('customer', customerName);
        setField('table', tableName);
        setField('guests', `${guestCount} khách`);
        setField('time', bookingTime);
        playAlertSound();
        new window.bootstrap.Modal(document.getElementById(MODAL_ID)).show();
    }
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const existing = Array.from(document.scripts).find(script => script.src && script.src.includes(src));
            if (existing) {
                if (existing.dataset.loaded === 'true') {
                    resolve();
                    return;
                }
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error(`Không tải được ${src}`)), { once: true });
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.addEventListener('load', () => {
                script.dataset.loaded = 'true';
                resolve();
            }, { once: true });
            script.addEventListener('error', () => reject(new Error(`Không tải được ${src}`)), { once: true });
            document.head.appendChild(script);
        });
    }
    async function ensureRealtimeClient() {
        if (!window.signalR) {
            await loadScript(SIGNALR_CDN);
        }
        if (!window.RestaurantRealtime) {
            await loadScript(REALTIME_CLIENT_PATH);
        }
    }
    async function init() {
        try {
            await ensureRealtimeClient();
            if (!window.RestaurantRealtime?.connect) return;
            await window.RestaurantRealtime.connect({
                debounceMs: 100,
                onReservationChanged: async (payload) => {
                    await showReservationAlert(payload);
                }
            });
        } catch (error) {
            console.warn('Không khởi tạo được thông báo đặt bàn toàn cục:', error.message);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
