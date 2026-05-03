document.addEventListener('DOMContentLoaded', () => {
    const customerForm = document.getElementById('customerForm');
    const customersTableBody = document.getElementById('customersTableBody');

    let currentPage = 1;
    const itemsPerPage = 10;
    
    const API_BASE_URL = 'http://localhost:7071/api';
    const CUSTOMERS_API_URL = `${API_BASE_URL}/Customers`;

    let allCustomers = JSON.parse(localStorage.getItem("bistro_customers") || "[]");
    let filteredData = [...allCustomers];

    async function request(url, options = {}) {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        });

        if (!response.ok) {
            let message = `API lỗi (${response.status})`;
            try {
                const body = await response.text();
                if (body) message = body;
            } catch (_) {}
            throw new Error(message);
        }

        if (response.status === 204) return null;
        return await response.json();
    }

    async function loadAndRenderCustomers(page = 1) {
        try {
            const query = new URLSearchParams({ page, pageSize: itemsPerPage, sortBy: 'createdAt', sortOrder: 'desc' });
            const resp = await request(`${CUSTOMERS_API_URL}?${query}`);
            if (resp && resp.items) {
                allCustomers = resp.items.map(c => ({
                    id: c.id || c.id,
                    name: c.fullName || c.name || c.fullname || c.full_name || '',
                    phone: c.phone || '',
                    email: c.email || '',
                    tier: c.tier || c.Tier || 'new',
                    visits: c.visits || c.Visits || 0,
                    totalSpent: c.totalSpent || c.TotalSpent || 0
                }));
                localStorage.setItem('bistro_customers', JSON.stringify(allCustomers));
                filteredData = [...allCustomers];
                currentPage = page;
                renderCustomers();
                return;
            }
        } catch (err) {
            console.warn('Không thể tải khách hàng từ API, sử dụng dữ liệu cục bộ:', err.message);
        }

        filteredData = [...allCustomers];
        renderCustomers();
    }

    function renderPagination() {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
        
        // Prev button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="prev">Trước</a>`;
        paginationContainer.appendChild(prevLi);
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${currentPage === i ? 'active' : ''}`;
            const activeClasses = currentPage === i ? 'bg-primary text-white' : 'text-secondary bg-light';
            li.innerHTML = `<a class="page-link rounded-pill border-0 ${activeClasses} px-3" href="#" data-page="${i}">${i}</a>`;
            paginationContainer.appendChild(li);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="next">Sau</a>`;
        paginationContainer.appendChild(nextLi);
        
        // Add event listeners
        paginationContainer.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                if (page === 'prev' && currentPage > 1) {
                    currentPage--;
                    renderCustomers();
                } else if (page === 'next' && currentPage < totalPages) {
                    currentPage++;
                    renderCustomers();
                } else if (page !== 'prev' && page !== 'next') {
                    currentPage = parseInt(page);
                    renderCustomers();
                }
            });
        });
    }

    // Render from loaded memory
    function renderCustomers() {
        if (!customersTableBody) return;
        customersTableBody.innerHTML = '';
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = filteredData.slice(startIndex, endIndex);
        
        if (pageData.length === 0) {
            customersTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Không tìm thấy dữ liệu</td></tr>';
            renderPagination();
            return;
        }

        pageData.forEach((cust, pageIndex) => {
            const actualIndex = startIndex + pageIndex;
            const name = cust.name || 'Khách';
            const phone = cust.phone || '-';
            const id = cust.id || ('KH' + String(Math.floor(Math.random() * 900) + 100));
            const rank = cust.tier || 'new';

            let initials = 'KH';
            if (name) {
                const parts = name.split(' ');
                if (parts.length > 1) {
                    initials = parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
                } else {
                    initials = parts[0].substring(0, 2);
                }
                initials = initials.toUpperCase();
            }

            let rankHtml = '';
            let avatarBg = '';
            let avatarColor = '';
            
            switch (rank) {
                case 'new':
                    rankHtml = '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 rounded-pill px-2 py-1"><span class="material-symbols-outlined" style="font-size: 14px; vertical-align: text-bottom;">fiber_new</span> Mới</span>';
                    avatarBg = 'bg-secondary bg-opacity-10';
                    avatarColor = 'text-secondary';
                    break;
                case 'silver':
                    rankHtml = '<span class="rank-badge rank-silver"><span class="material-symbols-outlined" style="font-size: 14px;">circle</span> Silver</span>';
                    avatarBg = 'bg-secondary bg-opacity-10';
                    avatarColor = 'text-secondary';
                    break;
                case 'gold':
                    rankHtml = '<span class="rank-badge rank-gold"><span class="material-symbols-outlined" style="font-size: 14px;">star</span> Gold</span>';
                    avatarBg = 'bg-success-light';
                    avatarColor = 'text-success';
                    break;
                case 'platinum':
                    rankHtml = '<span class="rank-badge rank-platinum"><span class="material-symbols-outlined" style="font-size: 14px;">diamond</span> Platinum</span>';
                    avatarBg = 'bg-primary-light';
                    avatarColor = 'text-primary';
                    break;
                default:
                    rankHtml = '<span class="badge bg-light text-dark border border-secondary border-opacity-25 rounded-pill px-2 py-1">Chưa có</span>';
                    avatarBg = 'bg-light';
                    avatarColor = 'text-dark';
            }

            // formatting currency
            const spentFormatted = (cust.totalSpent || 0).toLocaleString('vi-VN') + ' ₫';

            const tr = document.createElement('tr');
            tr.setAttribute('data-index', actualIndex);
            tr.innerHTML = `
                <td class="ps-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="avatar ${avatarBg} d-flex align-items-center justify-content-center ${avatarColor} fw-bold" style="width: 40px; height: 40px;">
                            ${initials}
                        </div>
                        <div>
                            <h6 class="mb-0 fw-semibold text-dark">${name}</h6>
                            <small class="text-muted">ID: ${id}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="small text-dark">${phone}</div>
                    <div class="small text-muted">-</div>
                </td>
                <td>${rankHtml}</td>
                <td class="fw-medium text-dark">${cust.visits || 1}</td>
                <td class="fw-bold text-dark">${spentFormatted}</td>
                <td class="small text-muted">Mới cập nhật</td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center edit-btn" style="width: 32px; height: 32px; border-radius: 50%; color: var(--text-soft) !important; background-color: #fff !important;" title="Sửa" onmouseover="this.style.backgroundColor='#f9f9f9'" onmouseout="this.style.backgroundColor='#fff'">
                            <span class="material-symbols-outlined fs-6">edit</span>
                        </button>
                        <button class="btn btn-light btn-icon border border-danger shadow-sm p-0 d-flex align-items-center justify-content-center text-danger delete-btn" style="width: 32px; height: 32px; border-radius: 50%; color: #dc3545 !important; background-color: #fff !important;" title="Xóa" onmouseover="this.style.backgroundColor='#fdf0f0'" onmouseout="this.style.backgroundColor='#fff'">
                            <span class="material-symbols-outlined fs-6">delete</span>
                        </button>
                    </div>
                </td>
            `;
            customersTableBody.appendChild(tr);
        });
        
        renderPagination();
    }

    // Filter logic
    function filterCustomers() {
        const searchInput = document.getElementById('searchCustomer');
        const rankFilter = document.getElementById('rankFilter');
        
        const q = searchInput ? searchInput.value.toLowerCase() : '';
        const rank = rankFilter ? rankFilter.value : '';
        
        filteredData = allCustomers.filter(c => {
            const matchName = (c.name || '').toLowerCase().includes(q);
            const matchPhone = (c.phone || '').includes(q);
            const matchRank = rank && rank !== 'Tất cả' ? (c.tier === rank) : true;
            return (matchName || matchPhone) && matchRank;
        });
        
        currentPage = 1;
        renderCustomers();
    }
    
    document.getElementById('searchCustomer')?.addEventListener('input', filterCustomers);
    document.getElementById('rankFilter')?.addEventListener('change', filterCustomers);

    // Try load from backend first, fallback will render local data
    loadAndRenderCustomers();

    let editingCustIndex = null;
    let customerToDeleteIndex = null;

    if (customersTableBody) {
        customersTableBody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const tr = btn.closest('tr');
            const dataIndex = parseInt(tr.getAttribute('data-index'));
            const cust = filteredData[dataIndex];
            const realIndex = allCustomers.findIndex(c => c === cust);
            
            if (btn.classList.contains('delete-btn')) {
                customerToDeleteIndex = realIndex;
                const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
                modal.show();
            } else if (btn.classList.contains('edit-btn')) {
                editingCustIndex = realIndex;
                document.getElementById('customerName').value = cust.name || '';
                document.getElementById('customerPhone').value = cust.phone || '';
                document.getElementById('customerEmail').value = cust.email || '';
                document.getElementById('customerRank').value = cust.tier || 'new';
                
                document.getElementById('addCustomerModalLabel').textContent = 'Sửa khách hàng';
                const modal = new bootstrap.Modal(document.getElementById('addCustomerModal'));
                modal.show();
            }
        });
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn') || document.querySelector('#deleteConfirmModal .btn-danger');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (customerToDeleteIndex !== null && customerToDeleteIndex > -1) {
                const cust = allCustomers[customerToDeleteIndex];
                try {
                    if (cust && cust.id) {
                        await request(`${CUSTOMERS_API_URL}/${encodeURIComponent(cust.id)}`, { method: 'DELETE' });
                        allCustomers.splice(customerToDeleteIndex, 1);
                        localStorage.setItem("bistro_customers", JSON.stringify(allCustomers));
                        filterCustomers();
                    }
                } catch (err) {
                    // fallback local
                    allCustomers.splice(customerToDeleteIndex, 1);
                    localStorage.setItem("bistro_customers", JSON.stringify(allCustomers));
                    filterCustomers();
                    console.warn('Xóa khách hàng cục bộ do API lỗi:', err.message);
                }

                const modalEl = document.getElementById('deleteConfirmModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                customerToDeleteIndex = null;
            }
        });
    }

    if (customerForm) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('customerName').value;
            const phone = document.getElementById('customerPhone').value;
            const email = document.getElementById('customerEmail').value || '-';
            const rank = document.getElementById('customerRank').value;

            if (editingCustIndex !== null && editingCustIndex > -1) {
                const existing = allCustomers[editingCustIndex];
                const payload = {
                    id: existing.id,
                    fullName: name,
                    phone,
                    email,
                    tier: rank
                };
                try {
                    await request(`${CUSTOMERS_API_URL}/${encodeURIComponent(existing.id)}`, { method: 'PUT', body: JSON.stringify(payload) });
                    allCustomers[editingCustIndex] = { ...existing, name, phone, email, tier: rank };
                } catch (err) {
                    // fallback local
                    allCustomers[editingCustIndex] = { ...existing, name, phone, email, tier: rank };
                    console.warn('Cập nhật cục bộ do API lỗi:', err.message);
                }
            } else {
                const newCustomer = {
                    id: 'KH' + String(Math.floor(Math.random() * 900) + 100),
                    fullName: name,
                    name,
                    phone,
                    email,
                    tier: rank,
                    visits: 0,
                    totalSpent: 0
                };
                try {
                    const created = await request(CUSTOMERS_API_URL, { method: 'POST', body: JSON.stringify(newCustomer) });
                    if (created) allCustomers.unshift({ id: created.id || newCustomer.id, name: created.fullName || name, phone: created.phone || phone, email: created.email || email, tier: created.tier || rank, visits: created.visits || 0, totalSpent: created.totalSpent || 0 });
                } catch (err) {
                    allCustomers.unshift(newCustomer);
                    console.warn('Tạo khách hàng cục bộ do API lỗi:', err.message);
                }
            }

            localStorage.setItem("bistro_customers", JSON.stringify(allCustomers));
            filterCustomers();

            const modalEl = document.getElementById('addCustomerModal');
            if (modalEl) {
                const modalInst = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modalInst.hide();
            }

            customerForm.reset();
            editingCustIndex = null;
            document.getElementById('addCustomerModalLabel').textContent = 'Thêm khách hàng';
        });
    }

    const btnOpenAddModal = document.querySelector('[data-bs-target="#addCustomerModal"]');
    if (btnOpenAddModal) {
        btnOpenAddModal.addEventListener('click', () => {
            editingCustIndex = null;
            customerForm.reset();
            document.getElementById('addCustomerModalLabel').textContent = 'Thêm khách hàng';
        });
    }
});
