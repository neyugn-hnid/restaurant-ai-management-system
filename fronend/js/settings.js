document.addEventListener('DOMContentLoaded', () => {
    console.log('Settings script loaded');

    // Handle settings menu navigation
    const menuItems = document.querySelectorAll('.settings-menu .nav-link');
    const sections = document.querySelectorAll('.settings-section');

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all items
            menuItems.forEach(link => {
                link.classList.remove('active');
                link.classList.add('text-secondary');
            });
            
            // Add active class to clicked item
            item.classList.add('active');
            item.classList.remove('text-secondary');

            // Find the target section ID based on the icon text
            const icon = item.querySelector('.material-symbols-outlined');
            if (icon) {
                const targetId = 'section-' + icon.textContent.trim();
                
                // Hide all sections
                sections.forEach(sec => sec.classList.add('d-none'));
                
                // Show the matched section
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    targetSection.classList.remove('d-none');
                }
            }
        });
    });

    // Handle form actions
    const saveBtns = document.querySelectorAll('.btn-primary.px-4');
    const cancelBtns = document.querySelectorAll('.btn-light.px-4');

    saveBtns.forEach(saveBtn => {
        saveBtn.addEventListener('click', () => {
            console.log('Saving settings...');
            
            // Save bank config if in payments section
            if (saveBtn.closest('#section-payments')) {
                const bankId = document.getElementById('bankName').value;
                const accountNo = document.getElementById('accountNumber').value;
                const accountName = document.getElementById('accountName').value;
                localStorage.setItem('bankConfig', JSON.stringify({ bankId, accountNo, accountName }));
            }
            
            // Simulate saving
            const originalText = saveBtn.textContent;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang lưu...';
            saveBtn.disabled = true;

            setTimeout(() => {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                
                // Show success toast or alert
                alert('Đã lưu cài đặt thành công!');
            }, 1000);
        });
    });

    // Handle VietQR Generation
    const generateQrBtn = document.getElementById('generateQrBtn');
    
    // Fetch banks from API
    const bankSelect = document.getElementById('bankName');
    if (bankSelect) {
        fetch('https://api.vietqr.io/v2/banks')
            .then(response => response.json())
            .then(data => {
                if (data.code === '00') {
                    bankSelect.innerHTML = ''; // clear options
                    
                    const savedBankConfigStr = localStorage.getItem('bankConfig');
                    let savedBankId = '970436';
                    if (savedBankConfigStr) {
                        try {
                            const savedBankConfig = JSON.parse(savedBankConfigStr);
                            savedBankId = savedBankConfig.bankId || '970436';
                            const btnAccNo = document.getElementById('accountNumber');
                            const btnAccName = document.getElementById('accountName');
                            if (btnAccNo) btnAccNo.value = savedBankConfig.accountNo || '';
                            if (btnAccName) btnAccName.value = savedBankConfig.accountName || '';
                            
                            const bankQrImage = document.getElementById('bankQrImage');
                            if (bankQrImage && savedBankConfig.accountNo) {
                                bankQrImage.src = `https://img.vietqr.io/image/${savedBankId}-${savedBankConfig.accountNo}-compact2.png?accountName=${encodeURIComponent(savedBankConfig.accountName)}`;
                            }
                        } catch(e) {}
                    }
                    
                    data.data.forEach(bank => {
                        const option = document.createElement('option');
                        option.value = bank.bin;
                        option.textContent = `${bank.shortName} - ${bank.name}`;
                        if (bank.bin === savedBankId) option.selected = true;
                        bankSelect.appendChild(option);
                    });
                }
            })
            .catch(error => console.error('Error fetching banks:', error));
    }

    if (generateQrBtn) {
        generateQrBtn.addEventListener('click', () => {
            const bankId = document.getElementById('bankName').value;
            const accountNo = document.getElementById('accountNumber').value;
            const accountName = document.getElementById('accountName').value;
            
            if (bankId && accountNo) {
                const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?accountName=${encodeURIComponent(accountName)}`;
                document.getElementById('bankQrImage').src = qrUrl;
                
                // Visual feedback for button
                const originalText = generateQrBtn.textContent;
                generateQrBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang tạo...';
                generateQrBtn.disabled = true;

                setTimeout(() => {
                    generateQrBtn.innerHTML = originalText;
                    generateQrBtn.disabled = false;
                }, 500);
            } else {
                alert('Vui lòng nhập đầy đủ Số tài khoản.');
            }
        });
    }
});
