import { ORDER_STATUSES, TABLE_STATUSES } from '/js/status-constants.js';

const API_BASE_URL = 'http://localhost:7071/api';
const ORDERS_API_URL = `${API_BASE_URL}/Orders`;

let ordersData = JSON.parse(localStorage.getItem('bistro_orders') || '[]');
if (ordersData.length === 0) {
    ordersData = window.BistroMockData?.MOCK_ORDERS || [];
    localStorage.setItem('bistro_orders', JSON.stringify(ordersData));
}

window.addEventListener('storage', (e) => {
    if (e.key === 'bistro_orders') {
        const newLocalOrders = JSON.parse(localStorage.getItem('bistro_orders') || '[]');
        ordersData = newLocalOrders;
        renderOrders();
    }
});

let currentFilter = 'Tất cả';
let currentSearch = '';
let orderToDeleteId = null;
let orderToUpdateId = null;
let currentPaymentOrderId = null;
let currentOrderDetailsId = null;

let currentPage = 1;
const itemsPerPage = 10;
let filteredData = [];

function getStatusClass(status) {
    switch(status) {
        case ORDER_STATUSES.PENDING_CONFIRMATION: return 'bg-warning bg-opacity-10 text-warning border-warning';
        case ORDER_STATUSES.PREPARING: return 'bg-info bg-opacity-10 text-info border-info';
        case ORDER_STATUSES.SERVED: return 'bg-primary-light border-primary';
        case ORDER_STATUSES.COMPLETED: return 'bg-success bg-opacity-10 text-success border-success';
        default: return 'bg-secondary bg-opacity-10 text-secondary border-secondary';
    }
}

function getStatusIcon(status) {
    switch(status) {
        case ORDER_STATUSES.PENDING_CONFIRMATION: return 'pending_actions';
        case ORDER_STATUSES.PREPARING: return 'skillet';
        case ORDER_STATUSES.SERVED: return 'room_service';
        case ORDER_STATUSES.COMPLETED: return 'check_circle';
        default: return 'help_outline';
    }
}

function renderPagination() {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    // totalPages calculation requires filteredData to already be up to date
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
                renderOrders(false);
            } else if (page === 'next' && currentPage < totalPages) {
                currentPage++;
                renderOrders(false);
            } else if (page !== 'prev' && page !== 'next') {
                currentPage = parseInt(page);
                renderOrders(false);
            }
        });
    });
}

// Simple request helper used across pages
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

async function loadAndRenderOrders(resetPage = false) {
    if (resetPage) currentPage = 1;
    try {
        const searchTerm = currentSearch || '';
        const query = new URLSearchParams({
            page: currentPage,
            pageSize: itemsPerPage,
            searchTerm: searchTerm,
            sortBy: 'createdAt',
            sortOrder: 'desc'
        });

        const resp = await request(`${ORDERS_API_URL}?${query}`);
        if (resp && resp.items) {
            ordersData = resp.items;
            // keep localStorage in sync for offline fallback
            localStorage.setItem('bistro_orders', JSON.stringify(ordersData));
        }
    } catch (err) {
        console.warn('Không thể tải đơn hàng từ API, sử dụng dữ liệu cục bộ:', err.message);
    }

    renderOrders(false);
}

function renderOrders(resetPage = false) {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody) return;
    
    if (resetPage) currentPage = 1;
    
    filteredData = ordersData.filter(order => {
        const matchesFilter = currentFilter === 'Tất cả' || order.status === currentFilter;
        const matchesSearch = currentSearch === '' || 
            order.id.toLowerCase().includes(currentSearch) || 
            (order.customer && order.customer.toLowerCase().includes(currentSearch)) || 
            (order.customerSubtext && order.customerSubtext.toLowerCase().includes(currentSearch));
        return matchesFilter && matchesSearch;
    });

    tableBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);

    if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary">Không tìm thấy đơn hàng nào</td></tr>`;
    } else {
        pageData.forEach(order => {
            const formattedTotal = new Intl.NumberFormat('vi-VN').format(order.total) + ' ₫';
            
            const statusClass = order.statusClass || getStatusClass(order.status);
            const itemsCount = order.itemsCount || (order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0);
            
            const orderCustomer = order.tableId ? `Bàn ${order.tableId}` : (order.customer || 'Khách vãng lai');
            const customerIcon = order.customerIcon || (order.tableId ? 'table_restaurant' : 'local_mall');
            const customerSubtext = order.customerSubtext || order.customerName || (order.customerPhone ? `SĐT: ${order.customerPhone}` : '');

            let customerHtml = `<div class="fw-medium text-dark d-flex align-items-center gap-2"><span class="material-symbols-outlined text-secondary fs-6">${customerIcon}</span> ${orderCustomer}</div>`;
            if (customerSubtext) {
                customerHtml += `<div class="small text-muted">${customerSubtext}</div>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4"><a href="#" class="text-decoration-none fw-semibold">${order.id}</a></td>
                <td>
                    <div class="fw-medium text-dark">${order.time}</div>
                    <div class="small text-muted">${order.date}</div>
                </td>
                <td>
                    ${customerHtml}
                </td>
                <td>${itemsCount} món</td>
                <td class="fw-bold text-dark">${formattedTotal}</td>
                <td><span class="badge ${statusClass} border px-2 py-1 rounded-pill d-inline-flex align-items-center">
                    <span class="material-symbols-outlined me-1" style="font-size: 14px !important;">${getStatusIcon(order.status)}</span>
                    ${order.status}
                </span></td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        ${order.status === ORDER_STATUSES.SERVED ? `
                        <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center payment-btn" data-id="${order.id}" data-total="${formattedTotal}" style="width: 32px; height: 32px; border-radius: 50%; color: #0d6efd !important; background-color: #fff !important;" title="Thanh toán QR" onmouseover="this.style.backgroundColor='#f0f7ff'" onmouseout="this.style.backgroundColor='#fff'">
                            <span class="material-symbols-outlined fs-6">qr_code_2</span>
                        </button>
                        ` : ''}
                        <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center view-details-btn" data-id="${order.id}" style="width: 32px; height: 32px; border-radius: 50%; color: var(--text-soft) !important; background-color: #fff !important;" title="Xem chi tiết" onmouseover="this.style.backgroundColor='#f9f9f9'" onmouseout="this.style.backgroundColor='#fff'">
                            <span class="material-symbols-outlined fs-6">visibility</span>
                        </button>
                        <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center update-status-btn" data-id="${order.id}" style="width: 32px; height: 32px; border-radius: 50%; color: var(--text-soft) !important; background-color: #fff !important;" title="Cập nhật trạng thái" onmouseover="this.style.backgroundColor='#f9f9f9'" onmouseout="this.style.backgroundColor='#fff'">
                            <span class="material-symbols-outlined fs-6">edit</span>
                        </button>
                        <button class="btn btn-light btn-icon border border-danger shadow-sm p-0 d-flex align-items-center justify-content-center text-danger delete-order-btn" data-id="${order.id}" style="width: 32px; height: 32px; border-radius: 50%; color: #dc3545 !important; background-color: #fff !important;" title="Xóa" onmouseover="this.style.backgroundColor='#fdf0f0'" onmouseout="this.style.backgroundColor='#fff'">
                            <span class="material-symbols-outlined fs-6">delete</span>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }
    
    renderPagination();

    // Update stats
    const totalEl = document.getElementById('stat-total');
    const pendingEl = document.getElementById('stat-pending');
    const cookingEl = document.getElementById('stat-cooking');
    const completedEl = document.getElementById('stat-completed');
    
    if (totalEl) totalEl.textContent = ordersData.length;
    if (pendingEl) pendingEl.textContent = ordersData.filter(o => o.status === ORDER_STATUSES.PENDING_CONFIRMATION).length;
    if (cookingEl) cookingEl.textContent = ordersData.filter(o => o.status === ORDER_STATUSES.PREPARING).length;
    if (completedEl) completedEl.textContent = ordersData.filter(o => o.status === ORDER_STATUSES.COMPLETED).length;

    document.querySelectorAll('.delete-order-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            orderToDeleteId = e.currentTarget.getAttribute('data-id');
            const confirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
            confirmModal.show();
        });
    });

    document.querySelectorAll('.update-status-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            orderToUpdateId = e.currentTarget.getAttribute('data-id');
            const order = ordersData.find(o => o.id === orderToUpdateId);
            if (order) {
                document.getElementById('updateStatusSelect').value = order.status;
                const modal = new bootstrap.Modal(document.getElementById('updateStatusModal'));
                modal.show();
            }
        });
    });

    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const id = e.currentTarget.getAttribute('data-id');
            const order = ordersData.find(o => o.id === id);
            if (!order) return;
            
            currentOrderDetailsId = id;
            document.getElementById('detailsModalOrderId').textContent = order.id;
            document.getElementById('detailsModalCustomer').textContent = order.customerSubtext || order.customerName || (order.customerIcon === 'local_mall' ? 'Khách lẻ' : 'Khách vãng lai');
            document.getElementById('detailsModalTable').textContent = (order.tableId || order.customerIcon === 'table_restaurant') ? (order.tableId || order.customer) : 'N/A';
            document.getElementById('detailsModalTime').textContent = `${order.time} - ${order.date}`;
            
            const tbody = document.getElementById('detailsModalItems');
            let itemsHtml = '';
            const items = order.items || [{ name: 'Món ăn/Thức uống', quantity: order.itemsCount || 1, price: order.total / (order.itemsCount || 1) }];
            items.forEach(item => {
                itemsHtml += `
                    <div class="d-flex justify-content-between mb-2 pb-2 border-bottom border-light">
                        <div>
                            <p class="mb-0 text-dark fw-medium">${item.name}</p>
                            <small class="text-muted">${item.quantity} x ${new Intl.NumberFormat('vi-VN').format(item.price)} ₫</small>
                        </div>
                        <div class="text-end fw-semibold text-dark">
                            ${new Intl.NumberFormat('vi-VN').format(item.quantity * item.price)} ₫
                        </div>
                    </div>
                `;
            });
            tbody.innerHTML = itemsHtml;
            
            const totalStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total);
            document.getElementById('detailsModalTotal').textContent = totalStr;

            const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
            modal.show();
        });
    });

    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const id = e.currentTarget.getAttribute('data-id');
            const order = ordersData.find(o => o.id === id);
            if (!order) return;
            
            currentPaymentOrderId = id;
            document.getElementById('paymentModalOrderId').textContent = order.id;
            document.getElementById('paymentModalCustomer').textContent = order.customerSubtext || order.customerName || (order.customerIcon === 'local_mall' ? 'Khách lẻ' : 'Khách vãng lai');
            document.getElementById('paymentModalTable').textContent = (order.tableId || order.customerIcon === 'table_restaurant') ? (order.tableId || order.customer) : 'N/A';
            document.getElementById('paymentModalTime').textContent = `${order.time} - ${order.date}`;
            
            const tbody = document.getElementById('paymentModalItems');
            let itemsHtml = '';
            const items = order.items || [{ name: 'Món ăn/Thức uống', quantity: order.itemsCount || 1, price: order.total / (order.itemsCount || 1) }];
            items.forEach(item => {
                itemsHtml += `
                    <div class="d-flex justify-content-between mb-2 pb-2 border-bottom border-light">
                        <div>
                            <p class="mb-0 text-dark fw-medium" style="font-size: 0.9rem;">${item.name}</p>
                            <small class="text-muted">${item.quantity} x ${new Intl.NumberFormat('vi-VN').format(item.price)} ₫</small>
                        </div>
                        <div class="text-end fw-semibold text-dark" style="font-size: 0.9rem;">
                            ${new Intl.NumberFormat('vi-VN').format(item.quantity * item.price)} ₫
                        </div>
                    </div>
                `;
            });
            tbody.innerHTML = itemsHtml;
            
            const totalStr = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total);
            document.getElementById('paymentModalTotal').textContent = totalStr;
            
            const savedBankConfigStr = localStorage.getItem('bankConfig');
            let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`PAY:${order.id}|TOTAL:${order.total}`)}`;
            
            if (savedBankConfigStr) {
                try {
                    const savedBankConfig = JSON.parse(savedBankConfigStr);
                    if (savedBankConfig.bankId && savedBankConfig.accountNo) {
                        qrUrl = `https://img.vietqr.io/image/${savedBankConfig.bankId}-${savedBankConfig.accountNo}-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent(order.id)}&accountName=${encodeURIComponent(savedBankConfig.accountName)}`;
                    }
                } catch(e) {}
            }
            
            document.getElementById('paymentModalQr').src = qrUrl;

            // Generate printable invoice HTML
            const printContainer = document.getElementById('printableInvoice');
            if (printContainer) {
                let printHtml = `
                    <div style="width: 80mm; margin: 0 auto; color: #000; font-family: 'Inter', sans-serif;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">Nhà Hàng Của Bạn</h2>
                            <p style="margin: 5px 0; font-size: 12px; color: #333;">Đ/C: Số 1, Đường Lê Duẩn, Quận 1, TP.HCM</p>
                            <p style="margin: 0; font-size: 12px; color: #333;">SĐT: 0123 456 789</p>
                            <h3 style="margin: 15px 0 10px; font-size: 18px;">PHIẾU THANH TOÁN</h3>
                        </div>
                        
                        <div style="font-size: 13px; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 2px 0;"><strong>Mã đơn:</strong> ${order.id}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><strong>Ngày giờ:</strong> ${order.date} ${order.time}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><strong>Khách hàng:</strong> ${order.customerSubtext || order.customerName || (order.customerIcon === 'local_mall' ? 'Khách lẻ' : 'Khách vãng lai')}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><strong>Bàn:</strong> ${(order.tableId || order.customerIcon === 'table_restaurant') ? (order.tableId || order.customer) : 'N/A'}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #000;">
                                        <th style="padding: 5px 0; text-align: left;">Món</th>
                                        <th style="padding: 5px 0; text-align: center; width: 40px;">SL</th>
                                        <th style="padding: 5px 0; text-align: right; width: 80px;">T.Tiền</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                items.forEach(item => {
                    printHtml += `
                                    <tr>
                                        <td style="padding: 5px 0;">${item.name}<br><small style="color:#555;">${new Intl.NumberFormat('vi-VN').format(item.price)}</small></td>
                                        <td style="padding: 5px 0; text-align: center;">${item.quantity}</td>
                                        <td style="padding: 5px 0; text-align: right;">${new Intl.NumberFormat('vi-VN').format(item.quantity * item.price)}</td>
                                    </tr>
                    `;
                });

                printHtml += `
                                </tbody>
                            </table>
                        </div>

                        <div style="font-size: 16px; font-weight: bold; text-align: right; margin-bottom: 20px;">
                            Tổng tiền: ${totalStr}
                        </div>
                        
                        <div style="text-align: center; margin-bottom: 20px;">
                            <p style="margin: 0 0 10px; font-size: 13px;">Mã QR Thanh toán:</p>
                            <img src="${qrUrl}" alt="QR code" style="width: 150px; height: 150px;" />
                        </div>
                        
                        <div style="text-align: center; font-size: 13px;">
                            <p style="margin: 5px 0;">Cảm ơn và hẹn gặp lại quý khách!</p>
                            <p style="margin: 5px 0;">***</p>
                        </div>
                    </div>
                `;
                printContainer.innerHTML = printHtml;
            }

            const printBtn = document.getElementById('printInvoiceBtn');
            if (printBtn) {
                printBtn.onclick = function(e) {
                    e.preventDefault();
                    window.print();
                    setTimeout(() => {
                         showToast('Lưu ý: Nếu trình duyệt không hiển thị popup in ấn, vui lòng mở ứng dụng trong Tab mới (icon góc phải phía trên) để có thể in hoá đơn nhé!', 'success');
                    }, 1000);
                };
            }

            const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
            modal.show();
        });
    });
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    if (toastEl) {
        const toastMessage = document.getElementById('toastMessage');
        toastMessage.textContent = message;
        
        if (type === 'success') {
            toastEl.className = 'toast align-items-center text-white bg-success border-0';
            toastEl.querySelector('.material-symbols-outlined').textContent = 'check_circle';
        } else if (type === 'danger') {
            toastEl.className = 'toast align-items-center text-white bg-danger border-0';
            toastEl.querySelector('.material-symbols-outlined').textContent = 'error';
        }
        
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadAndRenderOrders(true);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            currentSearch = e.target.value.toLowerCase().trim();
            currentPage = 1;
            await loadAndRenderOrders(true);
        });
    }

    const statusFilterHtml = document.getElementById('statusFilter');
    if (statusFilterHtml) {
        statusFilterHtml.addEventListener('change', async (e) => {
            currentFilter = e.target.value;
            currentPage = 1;
            await loadAndRenderOrders(true);
        });
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (orderToDeleteId) {
                try {
                    await request(`${ORDERS_API_URL}/${encodeURIComponent(orderToDeleteId)}`, { method: 'DELETE' });
                    ordersData = ordersData.filter(o => o.id !== orderToDeleteId);
                    localStorage.setItem('bistro_orders', JSON.stringify(ordersData));
                    showToast('Đã xóa đơn hàng thành công!', 'success');
                } catch (err) {
                    // Fallback to local removal
                    ordersData = ordersData.filter(o => o.id !== orderToDeleteId);
                    localStorage.setItem('bistro_orders', JSON.stringify(ordersData));
                    showToast('Xóa cục bộ do API lỗi.', 'danger');
                }

                orderToDeleteId = null;
                const modalEl = document.getElementById('deleteConfirmModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                await loadAndRenderOrders(false);
            }
        });
    }

    const addOrderForm = document.getElementById('addOrderForm');
    if (addOrderForm) {
        addOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const customer = document.getElementById('newOrderCustomer').value;
            const totalStr = document.getElementById('newOrderTotal').value;
            const status = document.getElementById('newOrderStatus').value;

            const newId = `ORD-${Math.floor(Math.random() * 9000) + 1000}`;
            const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const date = new Date().toLocaleDateString('vi-VN');

            const newOrder = {
                id: newId,
                time: time,
                date: date,
                customer: customer,
                customerIcon: customer.toLowerCase().includes('bàn') ? 'table_restaurant' : 'local_mall',
                customerSubtext: '',
                itemsCount: 1,
                subtotal: parseInt(totalStr, 10) || 0,
                discount: 0,
                total: parseInt(totalStr, 10) || 0,
                status: status,
                payment_method: 'cash',
                payment_status: 'pending'
            };

            try {
                const created = await request(ORDERS_API_URL, { method: 'POST', body: JSON.stringify(newOrder) });
                if (created) ordersData.unshift(created);
            } catch (err) {
                // fallback local
                ordersData.unshift(newOrder);
                showToast('Tạo đơn cục bộ do API lỗi.', 'danger');
            }

            localStorage.setItem('bistro_orders', JSON.stringify(ordersData));
            const modalEl = document.getElementById('addOrderModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            addOrderForm.reset();
            await loadAndRenderOrders(true);
            showToast('Tạo đơn hàng mới thành công!', 'success');
        });
    }

    const updateStatusForm = document.getElementById('updateStatusForm');
    if (updateStatusForm) {
        updateStatusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (orderToUpdateId) {
                const newStatus = document.getElementById('updateStatusSelect').value;
                const orderIdx = ordersData.findIndex(o => o.id === orderToUpdateId);
                if (orderIdx !== -1) {
                    const order = ordersData[orderIdx];
                    order.status = newStatus;
                    try {
                        await request(`${ORDERS_API_URL}/${encodeURIComponent(order.id)}`, { method: 'PUT', body: JSON.stringify(order) });
                    } catch (err) {
                        showToast('Cập nhật cục bộ do API lỗi.', 'danger');
                    }
                    ordersData[orderIdx] = order;
                    localStorage.setItem('bistro_orders', JSON.stringify(ordersData));
                }
                orderToUpdateId = null;
                const modalEl = document.getElementById('updateStatusModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                await loadAndRenderOrders(false);
                showToast('Cập nhật trạng thái thành công!', 'success');
            }
        });
    }

    const confirmToKitchenBtn = document.getElementById('confirmToKitchenBtn');
    if (confirmToKitchenBtn) {
        confirmToKitchenBtn.addEventListener('click', async () => {
            if (currentOrderDetailsId) {
                const idx = ordersData.findIndex(o => o.id === currentOrderDetailsId);
                if (idx !== -1) {
                    ordersData[idx].status = ORDER_STATUSES.PREPARING;
                    try {
                        await request(`${ORDERS_API_URL}/${encodeURIComponent(ordersData[idx].id)}`, { method: 'PUT', body: JSON.stringify(ordersData[idx]) });
                    } catch (err) {
                        showToast('Cập nhật cục bộ do API lỗi.', 'danger');
                    }
                    localStorage.setItem('bistro_orders', JSON.stringify(ordersData));
                }
                currentOrderDetailsId = null;
                const modalEl = document.getElementById('orderDetailsModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                await loadAndRenderOrders(false);
                showToast('Đã chuyển đơn hàng xuống bếp (Đang chế biến)!', 'success');
            }
        });
    }

    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', async () => {
            if (currentPaymentOrderId) {
                const idx = ordersData.findIndex(o => o.id === currentPaymentOrderId);
                if (idx !== -1) {
                    ordersData[idx].status = ORDER_STATUSES.COMPLETED;
                    try {
                        await request(`${ORDERS_API_URL}/${encodeURIComponent(ordersData[idx].id)}`, { method: 'PUT', body: JSON.stringify(ordersData[idx]) });
                    } catch (err) {
                        showToast('Cập nhật cục bộ do API lỗi.', 'danger');
                    }

                    // Nếu là đơn hàng tại bàn, chuyển trạng thái bàn sang "Chờ dọn dẹp"
                    if (ordersData[idx].customerIcon === 'table_restaurant' && ordersData[idx].customer) {
                        const tableStatuses = JSON.parse(localStorage.getItem('bistro_table_statuses') || '{}');
                        tableStatuses[ordersData[idx].customer] = TABLE_STATUSES.CLEANING;
                        localStorage.setItem('bistro_table_statuses', JSON.stringify(tableStatuses));
                    }
                    localStorage.setItem('bistro_orders', JSON.stringify(ordersData));
                }
                currentPaymentOrderId = null;
                const modalEl = document.getElementById('paymentModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                await loadAndRenderOrders(false);
                showToast('Thanh toán đơn hàng thành công!', 'success');
            }
        });
    }
});
