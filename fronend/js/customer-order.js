
import { GoogleGenAI, Type } from "@google/genai";
import { ORDER_STATUSES } from './status-constants.js';

document.addEventListener("DOMContentLoaded", async () => {
    let ai = null;
    try {
        const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : '';
        if (apiKey) {
            ai = new GoogleGenAI({ apiKey });
        }
    } catch (e) {
        console.warn("Could not initialize AI", e);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get("table");
    const tableNum = (tableParam !== null && !isNaN(Number(tableParam))) ? Number(tableParam) : (tableParam || "Khách vãng lai");
    document.getElementById("tableNumber").textContent = `Bàn: ${tableParam || tableNum}`;

    const API_BASE_URL = 'http://localhost:7071/api';
    const CATEGORIES_API_URL = `${API_BASE_URL}/Categories`;
    const PRODUCTS_API_URL = `${API_BASE_URL}/Products`;
    const CUSTOMERS_API_URL = `${API_BASE_URL}/Customers`;
    const ORDERS_API_URL = `${API_BASE_URL}/Orders`;

    async function request(url, options = {}) {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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


    let menuItems = [];
    let categories = [];

    async function loadMenuData() {
        try {
            const [catResp, prodResp] = await Promise.all([
                request(`${CATEGORIES_API_URL}?page=1&pageSize=100&sortBy=name&sortOrder=asc`),
                request(`${PRODUCTS_API_URL}?page=1&pageSize=1000&sortBy=createdAt&sortOrder=desc`)
            ]);

            if (catResp?.items) categories = catResp.items;
            if (prodResp?.items) {
                menuItems = prodResp.items.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.price || 0),
                    category: categories.find(c => c.id === p.categoryId)?.name || 'Khác',
                    categoryId: p.categoryId,
                    img: p.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop',
                    description: p.description || ''
                }));
            }
        } catch (err) {
            console.warn('Không thể tải menu từ API:', err.message);

            const cachedProducts = JSON.parse(localStorage.getItem('bistro_products') || '[]');
            const cachedCategories = JSON.parse(localStorage.getItem('bistro_categories') || '[]');
            if (cachedProducts.length > 0) {
                categories = cachedCategories;
                menuItems = cachedProducts.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: Number(p.price || 0),
                    category: cachedCategories.find(c => c.id === p.categoryId)?.name || 'Khác',
                    categoryId: p.categoryId,
                    img: p.imageUrl || p.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop',
                    description: p.description || ''
                }));
            }
        }
    }

    await loadMenuData();


    const categoryContainer = document.querySelector('.category-scroll');
    if (categoryContainer && categories.length > 0) {
        categoryContainer.innerHTML = '';
        const uniqueCategories = [...new Map(categories.map(c => [c.name, c])).values()];

        const allPill = document.createElement('div');
        allPill.className = 'category-pill active';
        allPill.textContent = 'Tất cả';
        allPill.addEventListener('click', () => {
            document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
            allPill.classList.add('active');
            renderMenu(menuItems);
        });
        categoryContainer.appendChild(allPill);

        uniqueCategories.forEach(cat => {
            const pill = document.createElement('div');
            pill.className = 'category-pill';
            pill.textContent = cat.name;
            pill.addEventListener('click', () => {
                document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const filtered = menuItems.filter(item => item.category === cat.name);
                renderMenu(filtered);
            });
            categoryContainer.appendChild(pill);
        });
    }

    let cart = [];

    const menuList = document.getElementById("menuList");

    function renderMenu(items) {
        if (!menuList) return;
        menuList.innerHTML = items.map(item => `
            <div class="menu-item-card">
                <div class="menu-item-img-wrapper">
                    <img src="${item.img}" alt="${item.name}" class="menu-item-img">
                </div>
                <div class="item-info">
                    <div class="item-cat">${item.category}</div>
                    <h6 class="item-title">${item.name}</h6>
                    <div class="item-price">${new Intl.NumberFormat("vi-VN").format(item.price)}đ</div>
                </div>
                <button class="add-btn" onclick="addToCart(${item.id}, event)">
                    <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">add</span>
                </button>
            </div>
        `).join("");
    }

    renderMenu(menuItems);


    const STORAGE_KEY_HISTORY = "bistro_customer_history";
    const STORAGE_KEY_POPULARITY = "bistro_item_popularity";

    function getHistory() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || "[]");
    }

    function saveToHistory(items) {
        const history = getHistory();
        const newHistory = [...new Set([...history, ...items.map(i => i.name)])];
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory.slice(-10)));
    }

    function getPopularity() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_POPULARITY) || "{}");
    }

    function updatePopularity(items) {
        const popularity = getPopularity();
        items.forEach(item => {
            popularity[item.name] = (popularity[item.name] || 0) + item.qty;
        });
        localStorage.setItem(STORAGE_KEY_POPULARITY, JSON.stringify(popularity));
    }

    function getTopPopular() {
        const popularity = getPopularity();
        return Object.entries(popularity)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(entry => entry[0]);
    }


    async function getAIRecommendations() {
        const suggestionSection = document.getElementById("ai-recommendation-section");
        const suggestionsList = document.getElementById("ai-suggestions-list");
        if (!suggestionSection || !suggestionsList) return;

        const now = new Date();
        const hour = now.getHours();
        let timeContext = "buổi sáng (ưu tiên năng lượng)";
        if (hour >= 11 && hour < 14) timeContext = "buổi trưa (ưu tiên nhanh, no bụng)";
        if (hour >= 14 && hour < 17) timeContext = "buổi chiều (ưu tiên ăn nhẹ, trà bánh)";
        if (hour >= 17) timeContext = "buổi tối (ưu tiên thư giãn, lẩu/nướng)";

        const currentCartNames = cart.map(i => i.name);
        const historyNames = getHistory();
        const topPopular = getTopPopular();

        try {
            if (!ai) {

                if (topPopular.length > 0) {
                    const popularItems = menuItems.filter(item => topPopular.includes(item.name));
                    if (popularItems.length > 0) {
                        suggestionSection.style.display = "block";
                        suggestionsList.innerHTML = popularItems.slice(0, 3).map(item => `
                            <div class="bg-white rounded-4 p-3 shadow-sm d-flex flex-column gap-2 ai-suggestion-card">
                                <div class="position-relative">
                                    <img src="${item.img}" class="rounded-3 ai-suggestion-img">
                                    <div class="position-absolute top-0 start-0 m-1">
                                        <span class="badge rounded-pill bg-primary ai-suggestion-badge">Phổ biến</span>
                                    </div>
                                </div>
                                <div>
                                    <div class="fw-bold small text-truncate ai-suggestion-name">${item.name}</div>
                                    <div class="text-success fw-bold small">${new Intl.NumberFormat("vi-VN").format(item.price)}đ</div>
                                </div>
                                <button class="btn btn-sm btn-outline-success rounded-pill fw-bold" onclick="addToCart(${item.id}, event)">+ Thêm ngay</button>
                            </div>
                        `).join("");
                    }
                }
                return;
            }

            const prompt = `Bạn là chuyên gia gợi ý thực đơn.
CONTEXT:
- Thời gian: ${timeContext}
- Giỏ hàng hiện tại: ${currentCartNames.join(", ") || "Trống"}
- Lịch sử khách đã gọi: ${historyNames.join(", ") || "Khách mới"}
- Top món bán chạy: ${topPopular.join(", ") || "Chưa có"}

MENU CỦA QUÁN:
${JSON.stringify(menuItems.map(m => ({ id: m.id, name: m.name, category: m.category })))}

Hãy chọn ra 3 món tốt nhất. Chỉ trả về JSON mảng ID các món.
JSON Format: [id1, id2, id3]`;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.ARRAY, items: { type: Type.INTEGER } }
                }
            });

            const recommendedIds = JSON.parse(response.text.trim());
            const recommendedItems = menuItems.filter(item => recommendedIds.includes(item.id));

            if (recommendedItems.length > 0) {
                suggestionSection.style.display = "block";
                suggestionsList.innerHTML = recommendedItems.map(item => `
                    <div class="bg-white rounded-4 p-3 shadow-sm d-flex flex-column gap-2 ai-suggestion-card">
                        <div class="position-relative">
                            <img src="${item.img}" class="rounded-3 ai-suggestion-img">
                            <div class="position-absolute top-0 start-0 m-1">
                                <span class="badge rounded-pill bg-primary ai-suggestion-badge">AI Gợi ý</span>
                            </div>
                        </div>
                        <div>
                            <div class="fw-bold small text-truncate ai-suggestion-name">${item.name}</div>
                            <div class="text-success fw-bold small">${new Intl.NumberFormat("vi-VN").format(item.price)}đ</div>
                        </div>
                        <button class="btn btn-sm btn-outline-success rounded-pill fw-bold" onclick="addToCart(${item.id}, event)">+ Thêm ngay</button>
                    </div>
                `).join("");
            }
        } catch (error) {
            console.error("AI Recommendation Error:", error);
        }
    }

    getAIRecommendations();

    window.addToCart = (id, event) => {
        const item = menuItems.find(i => i.id === id);
        if (!item) return;

        const existing = cart.find(c => c.id === id);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({ ...item, qty: 1 });
        }

        if (event && event.target) {
            updateCartUI(false);

            const btn = event.target.closest(".add-btn");
            const card = event.target.closest(".menu-item-card") || event.target.closest(".bg-white");
            const imgEl = card ? card.querySelector("img") : null;

            if (imgEl && btn) {
                const imgRect = imgEl.getBoundingClientRect();
                const flyingImg = imgEl.cloneNode(true);
                flyingImg.style.position = "fixed";
                flyingImg.style.top = imgRect.top + "px";
                flyingImg.style.left = imgRect.left + "px";
                flyingImg.style.width = imgRect.width + "px";
                flyingImg.style.height = imgRect.height + "px";
                flyingImg.style.borderRadius = "50%";
                flyingImg.style.objectFit = "cover";
                flyingImg.style.zIndex = "9999";
                flyingImg.style.transition = "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
                document.body.appendChild(flyingImg);

                const cartNav = document.getElementById("floatingCartBtn");
                let targetX = window.innerWidth - 50;
                let targetY = window.innerHeight - 50;

                if (cartNav) {
                    const badge = document.getElementById("cartCount");
                    if (badge) {
                        const badgeRect = badge.getBoundingClientRect();
                        if (badgeRect.width > 0) {
                            targetX = badgeRect.left + badgeRect.width / 2 - 10;
                            targetY = badgeRect.top + badgeRect.height / 2 - 10;
                        }
                    } else {
                        const cartRect = cartNav.getBoundingClientRect();
                        targetX = cartRect.left + cartRect.width / 2;
                        targetY = cartRect.top + cartRect.height / 2;
                    }
                }

                flyingImg.offsetHeight;
                flyingImg.style.top = targetY + "px";
                flyingImg.style.left = targetX + "px";
                flyingImg.style.width = "20px";
                flyingImg.style.height = "20px";
                flyingImg.style.opacity = "0";

                setTimeout(() => {
                    if (document.body.contains(flyingImg)) document.body.removeChild(flyingImg);
                    updateCartUI(true);
                }, 600);
            } else {
                updateCartUI(true);
            }
        } else {
            updateCartUI(true);
        }

        if (navigator.vibrate) navigator.vibrate(50);
        getAIRecommendations();
    };

    function updateCartUI(shouldBounce = true) {
        const bottomNav = document.getElementById("floatingCartBtn");
        const countEl = document.getElementById("cartCount");
        const totalEl = document.getElementById("cartTotal");

        const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
        const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

        if (totalCount > 0) {
            bottomNav.style.display = "flex";
            bottomNav.style.animation = "none";
            bottomNav.offsetHeight;
            bottomNav.style.animation = null;
            countEl.textContent = totalCount;
            if (totalEl) totalEl.textContent = new Intl.NumberFormat("vi-VN").format(totalPrice) + "đ";

            if (shouldBounce) {
                const wrapper = document.getElementById("floatingCartBtn");
                if (wrapper) {
                    wrapper.classList.remove("cart-bounce-animation");
                    void wrapper.offsetWidth;
                    wrapper.classList.add("cart-bounce-animation");
                }
            }
        } else {
            bottomNav.style.display = "none";
        }
    }

    function calculateTier(totalSpent) {
        if (totalSpent >= 50000000) return "platinum";
        if (totalSpent >= 20000000) return "gold";
        if (totalSpent >= 5000000) return "silver";
        if (totalSpent > 0) return "member";
        return "new";
    }


    let currentCustomer = null;
    const demoModalEl = document.getElementById("customerDemoModal");
    if (demoModalEl) {
        const customerDemoModal = new bootstrap.Modal(demoModalEl);
        customerDemoModal.show();

        const activeCustomer = sessionStorage.getItem("current_demo_customer");
        if (activeCustomer) {
            currentCustomer = JSON.parse(activeCustomer);
            document.getElementById("demoCustomerName").value = currentCustomer.name || "";
            document.getElementById("demoCustomerPhone").value = currentCustomer.phone || "";
        }

        document.getElementById("customerDemoForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("demoCustomerName").value.trim();
            const phone = document.getElementById("demoCustomerPhone").value.trim();

            let allCustomers = JSON.parse(localStorage.getItem("bistro_customers") || "[]");
            let cust = allCustomers.find(c => c.phone === phone);

            if (cust) {
                cust.visits = (cust.visits || 0) + 1;
                cust.tier = calculateTier(cust.totalSpent || 0);
                if (cust.name !== name) cust.name = name;
                try {
                    const payload = { id: cust.id, fullName: cust.name, phone: cust.phone, email: cust.email || '', tier: cust.tier };
                    await request(`${CUSTOMERS_API_URL}/${encodeURIComponent(cust.id)}`, { method: 'PUT', body: JSON.stringify(payload) });
                } catch (err) {
                    console.warn('Không thể cập nhật khách hàng lên API:', err.message);
                }
            } else {
                cust = {
                    id: "KH" + String(Date.now()).slice(-4),
                    name: name, fullName: name, phone: phone,
                    visits: 1, totalSpent: 0, tier: "new",
                    createdAt: new Date().toISOString()
                };
                try {
                    const created = await request(CUSTOMERS_API_URL, { method: 'POST', body: JSON.stringify(cust) });
                    if (created) {
                        cust = { id: created.id || cust.id, name: created.fullName || cust.name, phone: created.phone || cust.phone, visits: created.visits || 1, totalSpent: created.totalSpent || 0, tier: created.tier || 'new' };
                    }
                } catch (err) {
                    console.warn('Không thể tạo khách hàng trên API:', err.message);
                }
                allCustomers.unshift(cust);
            }

            localStorage.setItem("bistro_customers", JSON.stringify(allCustomers));
            sessionStorage.setItem("current_demo_customer", JSON.stringify(cust));
            currentCustomer = cust;

            const welcomeText = document.getElementById('welcomeText');
            if (welcomeText) welcomeText.innerHTML = `Chào, ${name}!`;

            customerDemoModal.hide();
            renderCartModal();
        });
    }

    function renderCartModal() {
        const cartList = document.getElementById("cartItemsList");
        if (!cartList) return;

        if (cart.length === 0) {
            cartList.innerHTML = '<p class="text-center text-muted py-4">Giỏ hàng trống</p>';
        } else {
            cartList.innerHTML = cart.map((item, idx) => `
                <div class="cart-item-row d-flex align-items-center gap-3">
                    <img src="${item.img}" alt="${item.name}" class="rounded-3 cart-item-img">
                    <div class="cart-item-name">
                        <div class="fw-bold text-truncate text-house-green">${item.name}</div>
                        <small class="text-muted">${new Intl.NumberFormat("vi-VN").format(item.price)}đ</small>
                    </div>
                    <div class="ms-auto d-flex align-items-center gap-2">
                        <button class="btn btn-sm btn-outline-secondary rounded-circle qty-dec" data-idx="${idx}" style="width:28px;height:28px;padding:0;">−</button>
                        <span class="fw-bold mx-1 qty-control">${item.qty}</span>
                        <button class="btn btn-sm btn-outline-secondary rounded-circle qty-inc" data-idx="${idx}" style="width:28px;height:28px;padding:0;">+</button>
                        <button class="btn btn-sm text-danger ms-1 remove-item" data-idx="${idx}">×</button>
                    </div>
                </div>
            `).join("");
        }

        const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        document.getElementById("modalSubtotal").textContent = new Intl.NumberFormat("vi-VN").format(total) + "đ";
        document.getElementById("modalTotal").textContent = new Intl.NumberFormat("vi-VN").format(total) + "đ";
    }


    document.getElementById("cartItemsList")?.addEventListener("click", (e) => {
        const decBtn = e.target.closest(".qty-dec");
        const incBtn = e.target.closest(".qty-inc");
        const rmBtn = e.target.closest(".remove-item");

        let idx;
        if (decBtn) {
            idx = parseInt(decBtn.dataset.idx);
            cart[idx].qty--;
            if (cart[idx].qty <= 0) cart.splice(idx, 1);
        } else if (incBtn) {
            idx = parseInt(incBtn.dataset.idx);
            cart[idx].qty++;
        } else if (rmBtn) {
            idx = parseInt(rmBtn.dataset.idx);
            cart.splice(idx, 1);
        } else return;

        updateCartUI(false);
        renderCartModal();
    });


    document.getElementById("confirmOrderBtn")?.addEventListener("click", async () => {
        if (cart.length === 0) return;

        const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const customerName = currentCustomer?.name || "Khách vãng lai";
        const customerPhone = currentCustomer?.phone || "";

        const newOrder = {
            id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            customerId: currentCustomer?.id || null,
            tableId: typeof tableNum === 'number' ? tableNum : null,
            itemsCount: cart.reduce((sum, item) => sum + item.qty, 0),
            items: cart.map(item => ({ name: item.name, quantity: item.qty, price: item.price })),
            subtotal: total,
            discount: 0,
            total: total,
            status: ORDER_STATUSES.PENDING_CONFIRMATION,
            statusClass: "bg-warning bg-opacity-10 text-warning border-warning",
            customer: String(tableNum),
            customerName: customerName,
            customerPhone: customerPhone,
            time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            date: new Date().toLocaleDateString("vi-VN")
        };

        let existingOrders = JSON.parse(localStorage.getItem("bistro_orders") || "[]");

        try {
            const resp = await fetch(ORDERS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newOrder)
            });
            if (resp.ok) {
                const created = await resp.json();
                existingOrders.unshift(created || newOrder);
            } else {
                existingOrders.unshift(newOrder);
            }
        } catch (err) {
            console.warn('Không thể tạo đơn trên API:', err.message);
            existingOrders.unshift(newOrder);
        }

        localStorage.setItem("bistro_orders", JSON.stringify(existingOrders));


        updatePopularity(cart);
        saveToHistory(cart);


        if (currentCustomer) {
            currentCustomer.totalSpent = (currentCustomer.totalSpent || 0) + total;
            currentCustomer.tier = calculateTier(currentCustomer.totalSpent);
            let allCustomers = JSON.parse(localStorage.getItem("bistro_customers") || "[]");
            const idx = allCustomers.findIndex(c => c.phone === currentCustomer.phone);
            if (idx >= 0) allCustomers[idx] = currentCustomer;
            else allCustomers.unshift(currentCustomer);
            localStorage.setItem("bistro_customers", JSON.stringify(allCustomers));
            sessionStorage.setItem("current_demo_customer", JSON.stringify(currentCustomer));
        }


        const toast = document.getElementById("orderToast");
        const toastMsg = document.getElementById("toastMessage");
        if (toast && toastMsg) {
            toastMsg.textContent = `Đặt ${cart.reduce((s, i) => s + i.qty, 0)} món thành công!`;
            new bootstrap.Toast(toast, { delay: 3000 }).show();
        }

        cart = [];
        updateCartUI(false);
        renderCartModal();

        const orderModal = bootstrap.Modal.getInstance(document.getElementById("orderModal"));
        if (orderModal) orderModal.hide();
    });


    document.getElementById("orderModal")?.addEventListener("show.bs.modal", renderCartModal);
});
