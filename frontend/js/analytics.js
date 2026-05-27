const API_BASE = 'http://localhost:7071/api';
const ORDERS_URL = `${API_BASE}/Orders`;
const CUSTOMERS_URL = `${API_BASE}/Customers`;
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
document.addEventListener('DOMContentLoaded', async () => {
    let orders = [], customers = [];
    let timeRange = 'month';
    async function loadData() {
        try {
            const [ordResp, custResp] = await Promise.all([
                apiFetch(`${ORDERS_URL}?page=1&pageSize=2000&sortBy=createdAt&sortOrder=desc`),
                apiFetch(`${CUSTOMERS_URL}?page=1&pageSize=2000&sortBy=createdAt&sortOrder=desc`)
            ]);
            orders = ordResp?.items || [];
            customers = custResp?.items || [];
            localStorage.setItem('bistro_orders', JSON.stringify(orders));
            localStorage.setItem('bistro_customers', JSON.stringify(customers));
        } catch (err) {
            console.warn('API unavailable, using cache:', err.message);
            orders = JSON.parse(localStorage.getItem('bistro_orders') || '[]');
            customers = JSON.parse(localStorage.getItem('bistro_customers') || '[]');
        }
    }
    await loadData();
    function filterByRange(items, range) {
        const now = new Date();
        let since = new Date();
        if (range === '7d') since.setDate(now.getDate() - 7);
        else if (range === 'month') since = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (range === 'year') since = new Date(now.getFullYear(), 0, 1);
        return items.filter(item => {
            const d = item.createdAt || item.date || item.created_at;
            if (!d) return true;
            const date = new Date(d);
            return date >= since;
        });
    }
    function refreshStats(range) {
        timeRange = range;
        const filtered = filterByRange(orders, range);
        const filteredCust = filterByRange(customers, range);
        const revenue = filtered.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const profit = Math.round(revenue * 0.4);
        const orderCount = filtered.length;
        const avgOrder = orderCount > 0 ? Math.round(revenue / orderCount) : 0;
        const prevRange = range === '7d' ? '14d' : range === 'month' ? 'prevMonth' : 'prevYear';
        let prevSince = new Date();
        if (range === '7d') { prevSince.setDate(prevSince.getDate() - 14); }
        else if (range === 'month') { prevSince = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1); }
        const prevFiltered = orders.filter(item => {
            const d = item.createdAt || item.date || item.created_at;
            if (!d) return false;
            const date = new Date(d);
            if (range === '7d') {
                const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
                return date >= prevSince && date < weekAgo;
            }
            return date >= prevSince && date < (range === 'month' ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) : new Date());
        });
        const prevRevenue = prevFiltered.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const prevCount = prevFiltered.length;
        const prevAvg = prevCount > 0 ? Math.round(prevRevenue / prevCount) : 0;
        const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100) : 0;
        const profitChange = revenueChange;
        const orderChange = prevCount > 0 ? ((orderCount - prevCount) / prevCount * 100) : 0;
        const avgChange = prevAvg > 0 ? ((avgOrder - prevAvg) / prevAvg * 100) : 0;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        const setTrend = (id, pct) => {
            const el = document.getElementById(id);
            if (!el) return;
            const isUp = pct >= 0;
            el.innerHTML = `<span class="material-symbols-outlined icon-trend-sm">${isUp ? 'trending_up' : 'trending_down'}</span> ${isUp ? '+' : ''}${pct.toFixed(1)}% so với kỳ trước`;
            el.className = `d-flex align-items-center gap-1 small fw-medium ${isUp ? 'text-success' : 'text-danger'}`;
        };
        setVal('statRevenue', (revenue / 1e6).toFixed(1) + 'M ₫');
        setVal('statProfit', (profit / 1e6).toFixed(1) + 'M ₫');
        setVal('statOrders', orderCount.toLocaleString('vi-VN'));
        setVal('statAvgOrder', Math.round(avgOrder / 1000) + 'K ₫');
        setTrend('trendRevenue', revenueChange);
        setTrend('trendProfit', profitChange);
        setTrend('trendOrders', orderChange);
        setTrend('trendAvgOrder', avgChange);
        const catRevenue = {};
        filtered.forEach(o => {
            const cat = o.category || (o.items?.[0]?.category) || 'Khác';
            catRevenue[cat] = (catRevenue[cat] || 0) + (Number(o.total) || 0);
        });
        const totalCatRev = Object.values(catRevenue).reduce((s, v) => s + v, 0) || 1;
        const topCats = Object.entries(catRevenue).sort((a, b) => b[1] - a[1]).slice(0, 4);
        ['catName1', 'catName2', 'catName3', 'catName4'].forEach((id, i) => {
            const el = document.getElementById(id);
            if (el && topCats[i]) el.textContent = topCats[i][0];
        });
        ['catPct1', 'catPct2', 'catPct3', 'catPct4'].forEach((id, i) => {
            const el = document.getElementById(id);
            if (el && topCats[i]) el.textContent = Math.round(topCats[i][1] / totalCatRev * 100) + '%';
        });
        ['catBar1', 'catBar2', 'catBar3', 'catBar4'].forEach((id, i) => {
            const el = document.getElementById(id);
            if (el && topCats[i]) el.style.width = Math.round(topCats[i][1] / totalCatRev * 100) + '%';
        });
        updateOrdersChart(filtered);
        updateCustomersChart(filteredCust);
    }
    function updateOrdersChart(filtered) {
        const canvas = document.getElementById('ordersChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const today = new Date();
        const dayBuckets = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('vi-VN');
            dayBuckets[key] = 0;
        }
        filtered.forEach(o => {
            const d = o.createdAt || o.date || o.created_at;
            if (!d) return;
            const key = new Date(d).toLocaleDateString('vi-VN');
            if (dayBuckets.hasOwnProperty(key)) dayBuckets[key]++;
        });
        const labels = Object.keys(dayBuckets).map(k => {
            const parts = k.split('/');
            return parts.length === 3 ? dayNames[new Date(parts[2], parts[1] - 1, parts[0]).getDay()] : k;
        });
        const data = Object.values(dayBuckets);
        if (canvas._chart) canvas._chart.destroy();
        canvas._chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Số lượng đơn hàng',
                    data: data,
                    backgroundColor: '#198754',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }
    function updateCustomersChart(filteredCust) {
        const canvas = document.getElementById('customersChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        const now = new Date();
        const monthBuckets = {};
        for (let i = 5; i >= 0; i--) {
            const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthBuckets[monthNames[m.getMonth()]] = 0;
        }
        filteredCust.forEach(c => {
            const d = c.createdAt || c.created_at;
            if (!d) return;
            const m = new Date(d).getMonth();
            const key = monthNames[m];
            if (monthBuckets.hasOwnProperty(key)) monthBuckets[key]++;
        });
        const labels = Object.keys(monthBuckets);
        const data = Object.values(monthBuckets);
        if (canvas._chart) canvas._chart.destroy();
        canvas._chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Khách hàng mới',
                    data: data,
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }
    const timeButtons = document.querySelectorAll('.bg-light.rounded-pill.border .btn');
    timeButtons.forEach(button => {
        button.addEventListener('click', () => {
            timeButtons.forEach(btn => {
                btn.classList.remove('btn-primary', 'shadow-sm');
                btn.classList.add('btn-light', 'text-secondary');
            });
            button.classList.remove('btn-light', 'text-secondary');
            button.classList.add('btn-primary', 'shadow-sm');
            const text = button.textContent.trim();
            const range = text.includes('Ngày') ? '7d' : text.includes('Năm') ? 'year' : 'month';
            refreshStats(range);
        });
    });
    document.querySelectorAll('.d-flex.gap-3 > .btn').forEach(btn => {
        if (btn.textContent.includes('Xuất Excel')) {
            btn.addEventListener('click', () => {
                const csv = 'ID,Trạng thái,Tổng tiền,Ngày\n' +
                    orders.map(o => `${o.id},${o.status},${o.total || 0},${o.createdAt || o.date || ''}`).join('\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bao-cao-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
    });
    refreshStats('month');
});
