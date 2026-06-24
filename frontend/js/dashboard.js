const API_BASE = window.API_BASE_URL;
const ORDERS_URL = `${API_BASE}/Orders`;
const CUSTOMERS_URL = `${API_BASE}/Customers`;
const TABLES_URL = `${API_BASE}/RestaurantTables`;
async function apiFetch(url) {
    const resp = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
    });
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    return resp.json();
}
document.addEventListener('DOMContentLoaded', async function() {
    let orders = [], customers = [], tables = [];
    try {
        const [ordResp, custResp, tableResp] = await Promise.all([
            apiFetch(`${ORDERS_URL}?page=1&pageSize=1000&sortBy=createdAt&sortOrder=desc`),
            apiFetch(`${CUSTOMERS_URL}?page=1&pageSize=1000&sortBy=createdAt&sortOrder=desc`),
            apiFetch(`${API_BASE}/RestaurantTables?page=1&pageSize=200&sortBy=id&sortOrder=asc`).catch(() => null)
        ]);
        orders = ordResp?.items || [];
        customers = custResp?.items || [];
        tables = tableResp?.items || [];
    } catch (err) {
        console.warn('API unavailable, using localStorage cache:', err.message);
        orders = JSON.parse(localStorage.getItem('bistro_orders') || '[]');
        customers = JSON.parse(localStorage.getItem('bistro_customers') || '[]');
        tables = []; // Không dùng localStorage cache
    }
    const tableStatuses = JSON.parse(localStorage.getItem('bistro_table_statuses') || '{}');
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const pendingOrders = orders.filter(o => {
        const s = (o.status || '').toLowerCase();
        return s.includes('chờ') || s.includes('pending');
    }).length;
    const totalCustomers = customers.length;
    const occupiedTables = Object.values(tableStatuses).filter(s => s === 'Đang phục vụ').length;
    const totalTables = tables.length || 42;
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    setText('statRevenue', totalRevenue.toLocaleString('vi-VN') + 'đ');
    setText('statNewOrders', pendingOrders);
    setText('statCustomers', totalCustomers.toLocaleString('vi-VN'));
    setText('statTablesServing', occupiedTables + ' / ' + totalTables);
    const tbody = document.getElementById('dashboardOrdersBody');
    if (tbody) {
        tbody.innerHTML = '';
        orders.slice(0, 5).forEach(o => {
            const status = o.status || '';
            let badgeClass = 'bg-secondary';
            if (status.includes('Chờ')) badgeClass = 'bg-warning text-dark';
            else if (status.includes('Đang chế biến') || status.includes('Preparing')) badgeClass = 'bg-info text-white';
            else if (status.includes('Hoàn thành') || status.includes('Đã phục vụ') || status.includes('Completed')) badgeClass = 'bg-success';
            else if (status.includes('Hủy') || status.includes('Cancelled')) badgeClass = 'bg-danger';
            const dateStr = o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '');
            const timeStr = o.time || (o.createdAt ? new Date(o.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '');
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><a href="./orders.html" class="text-decoration-none fw-semibold">#${o.id || '-'}</a></td>
                <td><div class="small">${timeStr} <span class="text-muted">${dateStr}</span></div></td>
                <td>${o.customer || o.table_id || o.tableId || '-'}</td>
                <td class="fw-semibold">${(Number(o.total) || 0).toLocaleString('vi-VN')} ₫</td>
                <td><span class="badge ${badgeClass}">${status || 'N/A'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
    const ctxRev = document.getElementById('revenueChart');
    if (ctxRev) {
        const revByDay = {};
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            revByDay[d.toLocaleDateString('vi-VN')] = 0;
        }
        orders.forEach(o => {
            const dateKey = o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '');
            if (revByDay.hasOwnProperty(dateKey)) {
                revByDay[dateKey] += Number(o.total) || 0;
            }
        });
        const labels = Object.keys(revByDay).map(d => {
            const parts = d.split('/');
            return parts.length === 3 ? dayNames[new Date(parts[2], parts[1] - 1, parts[0]).getDay()] : d;
        });
        const values = Object.values(revByDay);
        new Chart(ctxRev.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Doanh thu (VNĐ)',
                    data: values.length ? values : [12e6, 19e6, 15e6, 22e6, 18e6, 35e6, 42e6],
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => (v / 1e6).toFixed(1) + 'M' }
                    }
                }
            }
        });
    }
    const ctxStat = document.getElementById('statusChart');
    if (ctxStat) {
        const statusCounts = { 'Hoàn thành': 0, 'Đang chế biến': 0, 'Chờ xác nhận': 0, 'Hủy': 0 };
        orders.forEach(o => {
            const s = o.status || '';
            if (s.includes('Hoàn thành') || s.includes('Đã phục vụ') || s.includes('Completed')) statusCounts['Hoàn thành']++;
            else if (s.includes('Đang chế biến') || s.includes('Preparing')) statusCounts['Đang chế biến']++;
            else if (s.includes('Chờ') || s.includes('Pending')) statusCounts['Chờ xác nhận']++;
            else if (s.includes('Hủy') || s.includes('Cancelled')) statusCounts['Hủy']++;
            else statusCounts['Hoàn thành']++;
        });
        const vals = Object.values(statusCounts);
        new Chart(ctxStat.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Đã phục vụ', 'Đang chế biến', 'Chờ xác nhận', 'Hủy'],
                datasets: [{
                    data: vals.some(v => v > 0) ? vals : [65, 20, 10, 5],
                    backgroundColor: ['#198754', '#0dcaf0', '#ffc107', '#dc3545'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, pointStyle: 'rect' }
                    }
                },
                cutout: '70%'
            }
        });
    }
});
