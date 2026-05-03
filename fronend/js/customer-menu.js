

import { ORDER_STATUSES } from './status-constants.js';

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    if (tableParam) {
        sessionStorage.setItem("bookedTable", tableParam);
    }

    const API_BASE_URL = 'http://localhost:7071/api';
    const CATEGORIES_API_URL = `${API_BASE_URL}/Categories`;
    const PRODUCTS_API_URL = `${API_BASE_URL}/Products`;
    const ORDERS_API_URL = `${API_BASE_URL}/Orders`;

    async function request(url, options = {}) {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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

    let categories = [];
    let products = [];

    async function loadMenuData() {
        try {
            const [catResp, prodResp] = await Promise.all([
                request(`${CATEGORIES_API_URL}?page=1&pageSize=100&sortBy=name&sortOrder=asc`),
                request(`${PRODUCTS_API_URL}?page=1&pageSize=1000&sortBy=createdAt&sortOrder=desc`)
            ]);

            if (catResp?.items) categories = catResp.items;
            if (prodResp?.items) products = prodResp.items;


            categories = categories.map(cat => ({
                ...cat,
                _id: `cat-${cat.id}`
            }));


            products = products.map(prod => ({
                ...prod,
                image: prod.imageUrl || prod.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'
            }));


            localStorage.setItem('bistro_categories', JSON.stringify(categories));
            localStorage.setItem('bistro_products', JSON.stringify(products));
        } catch (err) {
            console.warn('Không thể tải menu từ API, thử dùng cache:', err.message);

            categories = JSON.parse(localStorage.getItem('bistro_categories') || '[]');
            products = JSON.parse(localStorage.getItem('bistro_products') || '[]');

            if (!categories.length || !products.length) {
                showError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
                return false;
            }
        }
        return true;
    }

    function showError(message) {
        const menuContainer = document.querySelector('main');
        if (menuContainer) {
            menuContainer.innerHTML = `
                <div style="text-align:center; padding: 8rem 2rem;">
                    <span class="material-symbols-outlined" style="font-size: 4rem; color: var(--color-text-muted);">error_outline</span>
                    <h3 style="color: var(--color-house-green); margin-top: 1.6rem;">${message}</h3>
                </div>`;
        }
    }

    const ok = await loadMenuData();
    if (!ok) return;

    const menuContainer = document.querySelector('main');


    const sections = Array.from(document.querySelectorAll('section.menu-stage'));
    sections.forEach(s => s.remove());


    categories.forEach((cat, index) => {
        const catProducts = products.filter(p => p.categoryId === cat.id);

        const section = document.createElement('section');
        section.className = 'menu-stage';
        section.id = cat._id;

        let headerHTML = `
            <div class="stage-header">
                <h2 class="stage-title">${cat.name}</h2>
                <span class="stage-desc">${cat.description || ''}</span>
            </div>
        `;

        let gridHTML = `<div class="menu-grid">`;

        if (catProducts.length === 0) {
            gridHTML += `<p class="body-text" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">Chưa có món nào trong danh mục này.</p>`;
        } else {
            catProducts.forEach(prod => {
                const imageUrl = prod.image || prod.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop';
                const price = typeof prod.price === 'number' ? prod.price : Number(prod.price || 0);

                gridHTML += `
                    <article class="menu-row">
                        <div class="img-wrap"><img src="${imageUrl}" alt="${prod.name}" referrerpolicy="no-referrer" loading="lazy"></div>
                        <div class="item-content">
                            <div class="item-header">
                                <div class="item-title-block"><h3 class="item-title">${prod.name}</h3></div>
                                <div class="item-action">
                                    <div class="item-price">${price.toLocaleString('vi-VN')} ₫</div>
                                    <button class="add-to-cart-btn" data-id="${prod.id}" title="Thêm vào giỏ">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    </button>
                                </div>
                            </div>
                            <p class="body-text">${prod.description || ''}</p>
                        </div>
                    </article>
                `;
            });
        }

        gridHTML += `</div>`;

        section.innerHTML = headerHTML + gridHTML;

        const promo = document.querySelector('.promo-vip');
        if (promo && index < 2) {
            menuContainer.insertBefore(section, promo);
        } else {
            menuContainer.appendChild(section);
        }
    });


    const filterIslandWrap = document.querySelector('.menu-filter-island');
    if (filterIslandWrap) {
        filterIslandWrap.innerHTML = '';
        categories.forEach((cat, index) => {
            const btn = document.createElement('a');
            btn.href = '#';
            btn.dataset.target = cat._id;
            btn.className = index === 0 ? 'active' : '';
            btn.textContent = cat.name;

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.menu-filter-island a').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');

                const target = document.getElementById(cat._id);
                if (target) {
                    const offset = target.getBoundingClientRect().top + window.scrollY - 130;
                    window.scrollTo({ top: offset, behavior: 'smooth' });
                }
            });

            filterIslandWrap.appendChild(btn);
        });


        window.addEventListener('scroll', () => {
            let currentId = '';
            document.querySelectorAll('section.menu-stage').forEach(section => {
                if (window.pageYOffset >= section.offsetTop - 150) {
                    currentId = section.getAttribute('id');
                }
            });
            if (currentId) {
                document.querySelectorAll('.menu-filter-island a').forEach(t => {
                    if (t.dataset.target === currentId) {
                        if (!t.classList.contains('active')) {
                            t.classList.add('active');
                            t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                        }
                    } else {
                        t.classList.remove('active');
                    }
                });
            }
        });
    }


    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (!btn) return;

        const prodId = parseInt(btn.getAttribute('data-id'));
        const product = products.find(p => p.id === prodId);

        if (!product) return;

        const article = btn.closest('article');
        const img = article ? article.querySelector('.img-wrap img') : null;
        const cartBtn = document.getElementById("floating-cart");

        if (img && cartBtn) {
            const imgRect = img.getBoundingClientRect();
            const cartRect = cartBtn.getBoundingClientRect();

            const copy = img.cloneNode();
            copy.style.position = 'fixed';
            copy.style.left = `${imgRect.left}px`;
            copy.style.top = `${imgRect.top}px`;
            copy.style.width = `${imgRect.width}px`;
            copy.style.height = `${imgRect.height}px`;
            copy.style.borderRadius = '50%';
            copy.style.objectFit = 'cover';
            copy.style.zIndex = '9999';
            copy.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
            document.body.appendChild(copy);

            copy.getBoundingClientRect();

            copy.style.left = `${cartRect.left + 10}px`;
            copy.style.top = `${cartRect.top + 10}px`;
            copy.style.width = '40px';
            copy.style.height = '40px';
            copy.style.opacity = '0.3';
            copy.style.transform = 'scale(0.2) rotate(360deg)';

            setTimeout(() => {
                copy.remove();
                cartBtn.style.transform = 'scale(1.15)';
                setTimeout(() => cartBtn.style.transform = 'scale(1)', 200);
            }, 600);
        }

        let currentCart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
        const existing = currentCart.find(item => item.id === prodId);
        if (existing) {
            existing.quantity += 1;
        } else {
            currentCart.push({ ...product, quantity: 1 });
        }

        localStorage.setItem('bistro_customer_cart', JSON.stringify(currentCart));

        if (typeof updateCartUI === "function") updateCartUI();
    });


    const cartButton = document.createElement("div");
    cartButton.innerHTML = `
      <div id="floating-cart" style="position: fixed; bottom: 30px; right: 30px; background: var(--color-house-green); color: white; width: 64px; height: 64px; border-radius: 50%; box-shadow: 0 10px 40px rgba(0,0,0,0.3); cursor: pointer; z-index: 1000; display: flex; align-items: center; justify-content: center; transition: transform 0.3s, opacity 0.3s; opacity: 0; pointer-events: none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 26px; height: 26px;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
        <span id="cart-badge" style="position: absolute; top: -2px; right: -2px; background: var(--color-gold); color: white; font-size: 1.3rem; font-weight: 700; min-width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">0</span>
      </div>`;
    document.body.appendChild(cartButton.firstElementChild);

    window.updateCartUI = function() {
        const cart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const floatingCart = document.getElementById('floating-cart');
        const badge = document.getElementById('cart-badge');

        if (floatingCart) {
            floatingCart.style.opacity = totalItems > 0 ? '1' : '0';
            floatingCart.style.pointerEvents = totalItems > 0 ? 'auto' : 'none';
        }
        if (badge) badge.textContent = totalItems;
    };


    const cartModalHTML = `
        <div id="cart-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; justify-content: flex-end; opacity: 0; pointer-events: none; transition: opacity 0.3s;">
            <div id="cart-panel" style="background: white; width: 100%; max-width: 420px; height: 100vh; overflow-y: auto; padding: 2rem; transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h3 style="color: var(--color-house-green); margin: 0;">Giỏ hàng</h3>
                    <button id="close-cart" style="background: none; border: none; font-size: 2rem; cursor: pointer; color: var(--color-text-muted);">&times;</button>
                </div>
                <div id="cart-items-list"></div>
                <div id="cart-summary" style="margin-top: 2rem; padding-top: 1.6rem; border-top: 2px solid var(--color-house-green);"></div>
                <button id="checkout-btn" style="width: 100%; padding: 1.6rem; background: var(--color-house-green); color: white; border: none; border-radius: 100px; font-weight: 700; font-size: 1.4rem; cursor: pointer; margin-top: 2rem;">Đặt món</button>
            </div>
        </div>
        <div id="order-success-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 3000; display: flex; justify-content: center; align-items: center; opacity: 0; pointer-events: none; transition: opacity 0.3s; backdrop-filter: blur(4px);">
            <div style="background: white; max-width: 420px; padding: 3rem; border-radius: 12px; text-align: center; transform: translateY(20px); transition: transform 0.3s;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(0,117,74,0.1); color: var(--color-accent); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.6rem;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h3 style="color: var(--color-house-green); margin-bottom: 1rem;">Đặt món thành công!</h3>
                <p id="order-success-msg" style="color: var(--color-text-muted); margin-bottom: 2rem;"></p>
                <button id="close-success-modal" style="padding: 1.2rem 3rem; background: var(--color-house-green); color: white; border: none; border-radius: 100px; font-weight: 600; cursor: pointer;">Đóng</button>
            </div>
        </div>`;

    document.body.insertAdjacentHTML('beforeend', cartModalHTML);

    const cartOverlay = document.getElementById('cart-overlay');
    const cartPanel = document.getElementById('cart-panel');

    document.getElementById('floating-cart').addEventListener('click', () => {
        renderCartItems();
        cartOverlay.style.opacity = '1';
        cartOverlay.style.pointerEvents = 'auto';
        cartPanel.style.transform = 'translateX(0)';
    });

    document.getElementById('close-cart').addEventListener('click', () => {
        cartOverlay.style.opacity = '0';
        cartOverlay.style.pointerEvents = 'none';
        cartPanel.style.transform = 'translateX(100%)';
    });

    cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) {
            document.getElementById('close-cart').click();
        }
    });

    document.getElementById('close-success-modal').addEventListener('click', () => {
        const modal = document.getElementById('order-success-modal');
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
    });

    function renderCartItems() {
        const cart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
        const listEl = document.getElementById('cart-items-list');
        const summaryEl = document.getElementById('cart-summary');

        if (cart.length === 0) {
            listEl.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); padding: 3rem;">Giỏ hàng trống</p>';
            summaryEl.innerHTML = '';
            return;
        }

        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        listEl.innerHTML = cart.map((item, idx) => `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #eee;">
                <img src="${item.image || item.imageUrl || ''}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--color-house-green);">${item.name}</div>
                    <div style="font-size: 1.2rem; color: var(--color-text-muted);">${(item.price).toLocaleString('vi-VN')} ₫</div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.8rem;">
                    <button class="qty-btn" data-idx="${idx}" data-action="minus" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--color-house-green); background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">−</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" data-idx="${idx}" data-action="plus" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--color-house-green); background: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
                    <button class="qty-btn" data-idx="${idx}" data-action="remove" style="margin-left: 0.5rem; color: #dc3545; border: none; background: none; cursor: pointer;">🗑</button>
                </div>
            </div>
        `).join('');

        summaryEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                <span style="color: var(--color-text-muted);">Tạm tính</span>
                <span style="font-weight: 600;">${total.toLocaleString('vi-VN')} ₫</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.4rem; font-weight: 700;">
                <span style="color: var(--color-house-green);">Tổng cộng</span>
                <span style="color: var(--color-accent);">${total.toLocaleString('vi-VN')} ₫</span>
            </div>
        `;
    }


    document.getElementById('cart-items-list').addEventListener('click', (e) => {
        const btn = e.target.closest('.qty-btn');
        if (!btn) return;

        const idx = parseInt(btn.dataset.idx);
        const action = btn.dataset.action;
        let cart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');

        if (action === 'plus') {
            cart[idx].quantity += 1;
        } else if (action === 'minus') {
            cart[idx].quantity -= 1;
            if (cart[idx].quantity <= 0) cart.splice(idx, 1);
        } else if (action === 'remove') {
            cart.splice(idx, 1);
        }

        localStorage.setItem('bistro_customer_cart', JSON.stringify(cart));
        renderCartItems();
        window.updateCartUI();
    });


    document.getElementById('checkout-btn').addEventListener('click', async () => {
        const cart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
        if (cart.length === 0) return;

        const cTable = sessionStorage.getItem('bookedTable') || 'Mang về';
        const cName = sessionStorage.getItem('customerName') || 'Quý khách';
        const finalTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

        let existingOrders = JSON.parse(localStorage.getItem('bistro_orders') || '[]');

        const activeOrderIndex = existingOrders.findIndex(o =>
            cTable !== 'Mang về' &&
            o.customer && o.customer.toLowerCase().includes(cTable.toLowerCase()) &&
            o.status !== 'Hoàn thành' && o.status !== 'Hủy'
        );

        if (activeOrderIndex !== -1) {
            const activeOrder = existingOrders[activeOrderIndex];
            cart.forEach(cartItem => {
                const existingItem = activeOrder.items.find(i => i.name === cartItem.name);
                if (existingItem) {
                    existingItem.quantity += cartItem.quantity;
                } else {
                    activeOrder.items.push({ name: cartItem.name, quantity: cartItem.quantity, price: cartItem.price });
                }
            });
            activeOrder.itemsCount += cart.reduce((sum, item) => sum + item.quantity, 0);
            activeOrder.total += finalTotal;
            activeOrder.status = ORDER_STATUSES.PENDING_CONFIRMATION;
            activeOrder.statusClass = 'bg-warning bg-opacity-10 text-warning border-warning';
            activeOrder.time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

            try {
                await fetch(`${ORDERS_API_URL}/${encodeURIComponent(activeOrder.id)}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(activeOrder)
                });
            } catch (err) {
                console.warn('Không thể cập nhật đơn lên API:', err.message);
            }
            existingOrders[activeOrderIndex] = activeOrder;
        } else {
            const newOrder = {
                id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
                customerId: null,
                tableId: (cTable !== 'Mang về' && !isNaN(Number(cTable))) ? Number(cTable) : (cTable !== 'Mang về' ? cTable : null),
                itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
                items: cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price })),
                subtotal: finalTotal,
                discount: 0,
                total: finalTotal,
                status: ORDER_STATUSES.PENDING_CONFIRMATION,
                statusClass: 'bg-warning bg-opacity-10 text-warning border-warning',
                customer: cTable,
                customerIcon: cTable === 'Mang về' ? 'local_mall' : 'table_restaurant',
                customerSubtext: cName !== 'Quý khách' ? cName : 'Từ QR Khách hàng',
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                date: new Date().toLocaleDateString('vi-VN')
            };
            try {
                const resp = await fetch(ORDERS_API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newOrder)
                });
                existingOrders.unshift(resp.ok ? (await resp.json()) : newOrder);
            } catch (err) {
                console.warn('Không thể tạo đơn trên API:', err.message);
                existingOrders.unshift(newOrder);
            }
        }

        localStorage.setItem('bistro_orders', JSON.stringify(existingOrders));

        const msgEl = document.getElementById('order-success-msg');
        msgEl.innerHTML = `Cảm ơn <b>${cName}</b>.<br/>Các món ăn đã được gửi yêu cầu lên hệ thống.`;

        const modal = document.getElementById('order-success-modal');
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        modal.querySelector('div').style.transform = 'translateY(0)';

        localStorage.setItem('bistro_customer_cart', JSON.stringify([]));
        window.updateCartUI();
        document.getElementById('close-cart').click();
    });


    window.updateCartUI();
});
