document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:7071/api';
    const PAYMENT_SETTINGS_URL = `${API_BASE_URL}/PaymentSettings`;

    const elements = {
        menuItems: document.querySelectorAll('.settings-menu .nav-link'),
        sections: document.querySelectorAll('.settings-section'),
        saveBtns: document.querySelectorAll('.btn-primary.px-4'),
        bankSelect: document.getElementById('bankName'),
        accountNumber: document.getElementById('accountNumber'),
        accountName: document.getElementById('accountName'),
        generateQrBtn: document.getElementById('generateQrBtn'),
        bankQrImage: document.getElementById('bankQrImage'),
        profileForm: document.getElementById('profileForm'),
        profileFullName: document.getElementById('profileFullName'),
        passwordForm: document.getElementById('passwordForm'),
        currentPassword: document.getElementById('currentPassword'),
        newPassword: document.getElementById('newPassword'),
        confirmNewPassword: document.getElementById('confirmNewPassword')
    };

    const state = {
        activeSection: 'section-general',
        paymentSettings: null
    };

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

    function generateQrUrl(bankId, accountNo, accountName) {
        return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?accountName=${encodeURIComponent(accountName || '')}`;
    }

    function bindTabNavigation() {
        elements.menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                elements.menuItems.forEach(link => { link.classList.remove('active'); link.classList.add('text-secondary'); });
                item.classList.add('active');
                item.classList.remove('text-secondary');

                const icon = item.querySelector('.material-symbols-outlined');
                if (icon) {
                    const targetId = 'section-' + icon.textContent.trim();
                    elements.sections.forEach(sec => sec.classList.add('d-none'));
                    const target = document.getElementById(targetId);
                    if (target) { target.classList.remove('d-none'); state.activeSection = targetId; }
                }
            });
        });
    }

    function bindSaveButtons() {
        elements.saveBtns.forEach(btn => {
            // Bỏ qua nút trong form profile/password (đã có handler riêng)
            if (btn.closest('#profileForm') || btn.closest('#passwordForm')) return;

            btn.addEventListener('click', async () => {
                if (btn.closest('#section-payments')) {
                    const dto = {
                        bankId: elements.bankSelect?.value || '',
                        accountNumber: elements.accountNumber?.value || '',
                        accountName: elements.accountName?.value || ''
                    };
                    const original = btn.innerHTML;
                    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
                    btn.disabled = true;
                    try {
                        const saved = await request(PAYMENT_SETTINGS_URL, { method: 'PUT', body: JSON.stringify(dto) });
                        state.paymentSettings = saved;
                        if (saved?.qrCodeUrl && elements.bankQrImage) {
                            elements.bankQrImage.src = saved.qrCodeUrl;
                        }
                        showToast('Đã lưu cài đặt thanh toán!');
                    } catch (err) {
                        showToast('Lỗi khi lưu: ' + err.message, 'danger');
                    }
                    btn.innerHTML = original;
                    btn.disabled = false;
                } else {
                    const original = btn.innerHTML;
                    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
                    btn.disabled = true;
                    setTimeout(() => { btn.innerHTML = original; btn.disabled = false; showToast('Đã lưu cài đặt!'); }, 800);
                }
            });
        });
    }

    async function loadPaymentSettings() {
        try {
            const settings = await request(PAYMENT_SETTINGS_URL);
            state.paymentSettings = settings;
            return settings;
        } catch (err) {
            console.warn('Không thể tải cài đặt thanh toán từ API:', err.message);
            return null;
        }
    }

    async function bindBankQR() {
        if (!elements.bankSelect) return;

        const settings = await loadPaymentSettings();
        const savedBankId = settings?.bankId || '970436';

        if (settings?.accountNumber && elements.accountNumber) elements.accountNumber.value = settings.accountNumber;
        if (settings?.accountName && elements.accountName) elements.accountName.value = settings.accountName || '';
        if (settings?.qrCodeUrl && elements.bankQrImage) {
            elements.bankQrImage.src = settings.qrCodeUrl;
        }

        fetch('https://api.vietqr.io/v2/banks')
            .then(r => r.json())
            .then(data => {
                if (data.code !== '00') return;
                elements.bankSelect.innerHTML = '';

                data.data.forEach(bank => {
                    const opt = document.createElement('option');
                    opt.value = bank.bin;
                    opt.textContent = `${bank.shortName} - ${bank.name}`;
                    if (bank.bin === savedBankId) opt.selected = true;
                    elements.bankSelect.appendChild(opt);
                });
            })
            .catch(() => console.warn('Không thể tải danh sách ngân hàng'));
    }

    async function bindQRGenerator() {
        elements.generateQrBtn?.addEventListener('click', async () => {
            const bankId = elements.bankSelect?.value;
            const accNo = elements.accountNumber?.value;
            const accName = elements.accountName?.value || '';
            if (!bankId || !accNo) { alert('Vui lòng nhập đầy đủ Số tài khoản.'); return; }

            const dto = {
                bankId: bankId,
                accountNumber: accNo,
                accountName: accName
            };

            const original = elements.generateQrBtn.innerHTML;
            elements.generateQrBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo...';
            elements.generateQrBtn.disabled = true;

            try {
                const saved = await request(PAYMENT_SETTINGS_URL, { method: 'PUT', body: JSON.stringify(dto) });
                state.paymentSettings = saved;
                if (saved?.qrCodeUrl && elements.bankQrImage) {
                    elements.bankQrImage.src = saved.qrCodeUrl;
                }
                showToast('Đã tạo mã QR!');
            } catch (err) {
                const qrUrl = generateQrUrl(bankId, accNo, accName);
                if (elements.bankQrImage) elements.bankQrImage.src = qrUrl;
                showToast('Đã tạo mã QR (lưu cục bộ)!', 'warning');
            }

            elements.generateQrBtn.innerHTML = original;
            elements.generateQrBtn.disabled = false;
        });
    }

    async function bindProfileForm() {
        if (!elements.profileForm) return;

        const user = window.Auth?.getUser();
        if (user?.fullName && elements.profileFullName) {
            elements.profileFullName.value = user.fullName;
        }

        elements.profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!user?.id) { showToast('Không xác định được tài khoản', 'danger'); return; }

            const btn = elements.profileForm.querySelector('button[type="submit"]');
            const original = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
            btn.disabled = true;

            try {
                const result = await request(`${API_BASE_URL}/Accounts/${user.id}/profile`, {
                    method: 'PUT',
                    body: JSON.stringify({ fullName: elements.profileFullName?.value || '' })
                });
                if (result?.fullName) {
                    const updatedUser = { ...user, fullName: result.fullName };
                    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
                    if (elements.profileFullName) elements.profileFullName.value = result.fullName;
                }
                showToast('Cập nhật thông tin thành công!');
            } catch (err) {
                showToast('Lỗi: ' + err.message, 'danger');
            }

            btn.innerHTML = original;
            btn.disabled = false;
        });
    }

    async function bindPasswordForm() {
        if (!elements.passwordForm) return;

        elements.passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = window.Auth?.getUser();
            if (!user?.id) { showToast('Không xác định được tài khoản', 'danger'); return; }

            const currentPassword = elements.currentPassword?.value || '';
            const newPassword = elements.newPassword?.value || '';
            const confirmNewPassword = elements.confirmNewPassword?.value || '';

            if (!currentPassword || !newPassword || !confirmNewPassword) {
                showToast('Vui lòng nhập đầy đủ thông tin mật khẩu', 'warning');
                return;
            }

            if (newPassword !== confirmNewPassword) {
                showToast('Xác nhận mật khẩu mới không khớp', 'warning');
                return;
            }

            if (newPassword.length < 6) {
                showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'warning');
                return;
            }

            const btn = elements.passwordForm.querySelector('button[type="submit"]');
            const original = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';
            btn.disabled = true;

            try {
                await request(`${API_BASE_URL}/Accounts/${user.id}/password`, {
                    method: 'PUT',
                    body: JSON.stringify({ currentPassword, newPassword, confirmPassword: confirmNewPassword })
                });
                showToast('Đổi mật khẩu thành công!');
                elements.passwordForm.reset();
            } catch (err) {
                showToast('Lỗi: ' + err.message, 'danger');
            }

            btn.innerHTML = original;
            btn.disabled = false;
        });
    }

    bindTabNavigation();
    bindSaveButtons();
    bindBankQR();
    bindQRGenerator();
    bindProfileForm();
    bindPasswordForm();
});
