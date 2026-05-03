document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        menuItems: document.querySelectorAll('.settings-menu .nav-link'),
        sections: document.querySelectorAll('.settings-section'),
        saveBtns: document.querySelectorAll('.btn-primary.px-4'),
        bankSelect: document.getElementById('bankName'),
        accountNumber: document.getElementById('accountNumber'),
        accountName: document.getElementById('accountName'),
        generateQrBtn: document.getElementById('generateQrBtn'),
        bankQrImage: document.getElementById('bankQrImage')
    };

    const state = {
        activeSection: 'section-general'
    };

    function showToast(message, type = 'success') {
        const toast = document.getElementById('liveToast');
        const msg = document.getElementById('toastMessage');
        if (!toast || !msg) { alert(message); return; }
        msg.textContent = message;
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        new bootstrap.Toast(toast, { delay: 3000 }).show();
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
            btn.addEventListener('click', () => {
                if (btn.closest('#section-payments')) {
                    const config = {
                        bankId: elements.bankSelect?.value || '',
                        accountNo: elements.accountNumber?.value || '',
                        accountName: elements.accountName?.value || ''
                    };
                    localStorage.setItem('bankConfig', JSON.stringify(config));
                }
                const original = btn.innerHTML;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
                btn.disabled = true;
                setTimeout(() => { btn.innerHTML = original; btn.disabled = false; showToast('Đã lưu cài đặt!'); }, 800);
            });
        });
    }

    function bindBankQR() {
        if (!elements.bankSelect) return;

        fetch('https://api.vietqr.io/v2/banks')
            .then(r => r.json())
            .then(data => {
                if (data.code !== '00') return;
                elements.bankSelect.innerHTML = '';

                const saved = (() => { try { return JSON.parse(localStorage.getItem('bankConfig') || '{}'); } catch (_) { return {}; } })();
                const savedBankId = saved.bankId || '970436';

                if (saved.accountNo && elements.accountNumber) elements.accountNumber.value = saved.accountNo;
                if (saved.accountName && elements.accountName) elements.accountName.value = saved.accountName || '';
                if (saved.accountNo && elements.bankQrImage) {
                    elements.bankQrImage.src = `https://img.vietqr.io/image/${savedBankId}-${saved.accountNo}-compact2.png?accountName=${encodeURIComponent(saved.accountName || '')}`;
                }

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

    function bindQRGenerator() {
        elements.generateQrBtn?.addEventListener('click', () => {
            const bankId = elements.bankSelect?.value;
            const accNo = elements.accountNumber?.value;
            const accName = elements.accountName?.value || '';
            if (!bankId || !accNo) { alert('Vui lòng nhập đầy đủ Số tài khoản.'); return; }

            const qrUrl = `https://img.vietqr.io/image/${bankId}-${accNo}-compact2.png?accountName=${encodeURIComponent(accName)}`;
            if (elements.bankQrImage) elements.bankQrImage.src = qrUrl;

            const original = elements.generateQrBtn.innerHTML;
            elements.generateQrBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang tạo...';
            elements.generateQrBtn.disabled = true;
            setTimeout(() => { elements.generateQrBtn.innerHTML = original; elements.generateQrBtn.disabled = false; }, 500);
        });
    }

    bindTabNavigation();
    bindSaveButtons();
    bindBankQR();
    bindQRGenerator();
});
