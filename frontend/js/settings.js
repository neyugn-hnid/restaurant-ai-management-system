document.addEventListener('DOMContentLoaded', () => {
    const FV = window.FormValidation;
    const API_BASE_URL = 'http://localhost:7071/api';
    const PAYMENT_SETTINGS_URL = `${API_BASE_URL}/PaymentSettings`;
    const elements = {
        menuColumn: document.getElementById('settingsMenuColumn'),
        contentColumn: document.getElementById('settingsContentColumn'),
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
    function getCurrentUserRole() {
        if (window.Auth?.getRole) {
            return window.Auth.getRole();
        }
        const user = window.Auth?.getUser?.();
        const rawRole = String(user?.role || (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) || 'Staff')
            .trim()
            .toUpperCase()
            .replace(/^ROLE_/, '');
        if (rawRole === 'STAFF' || rawRole === 'EMPLOYEE' || rawRole === 'NHANVIEN' || rawRole === 'NHAN_VIEN') {
            return 'Staff';
        }
        return rawRole.charAt(0) + rawRole.slice(1).toLowerCase();
    }
    const isStaffRole = getCurrentUserRole() === 'Staff';
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
    function activateSection(targetId) {
        elements.menuItems.forEach(link => {
            const icon = link.querySelector('.material-symbols-outlined');
            const linkTargetId = icon ? `section-${icon.textContent.trim()}` : '';
            const isActive = linkTargetId === targetId;
            link.classList.toggle('active', isActive);
            link.classList.toggle('text-secondary', !isActive);
        });
        elements.sections.forEach(sec => {
            sec.classList.toggle('d-none', sec.id !== targetId);
        });
        state.activeSection = targetId;
    }
    function applyRoleVisibility() {
        if (!isStaffRole) return;
        document.querySelectorAll('[data-admin-only="true"]').forEach(element => {
            element.classList.add('d-none');
        });
        if (elements.menuColumn) {
            elements.menuColumn.classList.add('d-none');
        }
        if (elements.contentColumn) {
            elements.contentColumn.classList.remove('col-md-9');
            elements.contentColumn.classList.add('col-12', 'col-xl-8', 'mx-auto');
        }
        activateSection('section-account_circle');
    }
    function bindTabNavigation() {
        elements.menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                if (item.closest('.d-none')) return;
                const icon = item.querySelector('.material-symbols-outlined');
                if (!icon) return;
                activateSection(`section-${icon.textContent.trim()}`);
            });
        });
    }
    function bindSaveButtons() {
        elements.saveBtns.forEach(btn => {
            if (btn.closest('#profileForm') || btn.closest('#passwordForm')) return;
            btn.addEventListener('click', async () => {
                if (btn.closest('#section-payments')) {
                    let isValid = true;
                    FV?.clearFieldError(elements.bankSelect);
                    FV?.clearFieldError(elements.accountNumber);
                    FV?.clearFieldError(elements.accountName);
                    if (!elements.bankSelect?.value) {
                        isValid = FV ? FV.setFieldError(elements.bankSelect, 'Vui lòng chọn ngân hàng.') : false;
                    } else {
                        FV?.markFieldValid(elements.bankSelect);
                    }
                    if (!/^\d{6,20}$/.test(String(elements.accountNumber?.value || '').trim())) {
                        isValid = FV ? FV.setFieldError(elements.accountNumber, 'Số tài khoản phải từ 6 đến 20 chữ số.') : false;
                    } else {
                        FV?.markFieldValid(elements.accountNumber);
                    }
                    const normalizedAccountName = FV?.normalizeWhitespace(elements.accountName?.value) || '';
                    if (!normalizedAccountName || normalizedAccountName.length < 2) {
                        isValid = FV ? FV.setFieldError(elements.accountName, 'Tên chủ tài khoản phải có ít nhất 2 ký tự.') : false;
                    } else {
                        elements.accountName.value = normalizedAccountName;
                        FV?.markFieldValid(elements.accountName);
                    }
                    if (!isValid) return;
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
        if (!elements.bankSelect || isStaffRole) return;
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
        if (isStaffRole) return;
        elements.generateQrBtn?.addEventListener('click', async () => {
            const bankId = elements.bankSelect?.value;
            const accNo = String(elements.accountNumber?.value || '').trim();
            const accName = FV?.normalizeWhitespace(elements.accountName?.value) || '';
            let isValid = true;
            if (!bankId) {
                isValid = FV ? FV.setFieldError(elements.bankSelect, 'Vui lòng chọn ngân hàng.') : false;
            } else {
                FV?.markFieldValid(elements.bankSelect);
            }
            if (!/^\d{6,20}$/.test(accNo)) {
                isValid = FV ? FV.setFieldError(elements.accountNumber, 'Số tài khoản phải từ 6 đến 20 chữ số.') : false;
            } else {
                FV?.markFieldValid(elements.accountNumber);
            }
            if (!accName || accName.length < 2) {
                isValid = FV ? FV.setFieldError(elements.accountName, 'Tên chủ tài khoản phải có ít nhất 2 ký tự.') : false;
            } else {
                elements.accountName.value = accName;
                FV?.markFieldValid(elements.accountName);
            }
            if (!isValid) return;
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
            const fullName = FV?.normalizeWhitespace(elements.profileFullName?.value) || '';
            FV?.clearFormErrors(elements.profileForm);
            if (!fullName) {
                FV?.setFieldError(elements.profileFullName, 'Vui lòng nhập họ và tên.');
                return;
            } else if (fullName.length < 2 || fullName.length > 100) {
                FV?.setFieldError(elements.profileFullName, 'Họ và tên phải từ 2 đến 100 ký tự.');
                return;
            }
            elements.profileFullName.value = fullName;
            FV?.markFieldValid(elements.profileFullName);
            const btn = elements.profileForm.querySelector('button[type="submit"]');
            const original = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
            btn.disabled = true;
            try {
                const result = await request(`${API_BASE_URL}/Accounts/${user.id}/profile`, {
                    method: 'PUT',
                    body: JSON.stringify({ fullName })
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
            FV?.clearFormErrors(elements.passwordForm);
            if (!currentPassword) {
                FV?.setFieldError(elements.currentPassword, 'Vui lòng nhập mật khẩu hiện tại.');
                return;
            }
            if (!newPassword) {
                FV?.setFieldError(elements.newPassword, 'Vui lòng nhập mật khẩu mới.');
                return;
            } else if (newPassword.length < 6) {
                FV?.setFieldError(elements.newPassword, 'Mật khẩu mới phải có ít nhất 6 ký tự.');
                return;
            }
            if (!confirmNewPassword) {
                FV?.setFieldError(elements.confirmNewPassword, 'Vui lòng xác nhận mật khẩu mới.');
                return;
            } else if (newPassword !== confirmNewPassword) {
                FV?.setFieldError(elements.confirmNewPassword, 'Xác nhận mật khẩu mới không khớp.');
                return;
            }
            FV?.markFieldValid(elements.currentPassword);
            FV?.markFieldValid(elements.newPassword);
            FV?.markFieldValid(elements.confirmNewPassword);
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
    applyRoleVisibility();
    bindBankQR();
    bindQRGenerator();
    bindProfileForm();
    bindPasswordForm();
    bindAddressApi();
    FV?.enableInstantClear(elements.profileForm);
    FV?.enableInstantClear(elements.passwordForm);
});
function bindAddressApi() {
    const API = 'https://provinces.open-api.vn/api';
    const provinceEl = document.getElementById('provinceSelect');
    const districtEl = document.getElementById('districtSelect');
    const wardEl = document.getElementById('wardSelect');
    if (!provinceEl) return;
    fetch(`${API}/p/`)
        .then(r => r.json())
        .then(data => {
            data.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.code;
                opt.textContent = p.name;
                provinceEl.appendChild(opt);
            });
        })
        .catch(() => provinceEl.innerHTML += '<option>Lỗi tải dữ liệu</option>');
    provinceEl.addEventListener('change', () => {
        districtEl.innerHTML = '<option value="">-- Chọn Quận/Huyện --</option>';
        wardEl.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
        districtEl.disabled = true;
        wardEl.disabled = true;
        if (!provinceEl.value) return;
        fetch(`${API}/p/${provinceEl.value}?depth=2`)
            .then(r => r.json())
            .then(data => {
                districtEl.disabled = false;
                (data.districts || []).forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.code;
                    opt.textContent = d.name;
                    districtEl.appendChild(opt);
                });
            });
    });
    districtEl.addEventListener('change', () => {
        wardEl.innerHTML = '<option value="">-- Chọn Phường/Xã --</option>';
        wardEl.disabled = true;
        if (!districtEl.value) return;
        fetch(`${API}/d/${districtEl.value}?depth=2`)
            .then(r => r.json())
            .then(data => {
                wardEl.disabled = false;
                (data.wards || []).forEach(w => {
                    const opt = document.createElement('option');
                    opt.value = w.code;
                    opt.textContent = w.name;
                    wardEl.appendChild(opt);
                });
            });
    });
}
