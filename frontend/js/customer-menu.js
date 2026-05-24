

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
    const RESERVATIONS_API_URL = `${API_BASE_URL}/Reservations`;
    const AI_RECOMMENDATIONS_URL = `${API_BASE_URL}/AiRecommendations`;
    const PENDING_PREORDERS_KEY = 'bistro_pending_preorders';
    const PREORDER_NOTE_TAG = '[PREORDER]';

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
    let aiSuggestionSection = null;

    function ensureAiSuggestionSection() {
        if (aiSuggestionSection) return aiSuggestionSection;

        aiSuggestionSection = document.createElement('section');
        aiSuggestionSection.className = 'menu-stage';
        aiSuggestionSection.id = 'ai-dish-recommendations';
        aiSuggestionSection.innerHTML = `
            <div class="stage-header">
                <div>
                    <span class="subheading">DeepSeek Picks</span>
                    <h2 class="stage-title">Gợi Ý Món Ăn</h2>
                </div>
                <span class="stage-desc" id="ai-dish-summary">Đang chuẩn bị gợi ý cho bạn</span>
            </div>
            <div class="menu-grid" id="ai-dish-list"></div>
        `;

        menuContainer.prepend(aiSuggestionSection);
        return aiSuggestionSection;
    }

    function getCurrentCart() {
        return JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
    }

    function readPendingPreorders() {
        return JSON.parse(localStorage.getItem(PENDING_PREORDERS_KEY) || '[]');
    }

    function writePendingPreorders(preorders) {
        localStorage.setItem(PENDING_PREORDERS_KEY, JSON.stringify(preorders));
    }

    function stripPreorderFromNotes(notes) {
        const text = String(notes || '');
        const markerIndex = text.indexOf(PREORDER_NOTE_TAG);
        return markerIndex >= 0 ? text.slice(0, markerIndex).trim() : text.trim();
    }

    function buildReservationNotesWithPreorder(existingNotes, preorder) {
        const baseNotes = stripPreorderFromNotes(existingNotes);
        const preorderPayload = JSON.stringify({
            itemsCount: preorder.itemsCount,
            total: preorder.total,
            items: preorder.items
        });
        return baseNotes
            ? `${baseNotes}\n\n${PREORDER_NOTE_TAG}${preorderPayload}`
            : `${PREORDER_NOTE_TAG}${preorderPayload}`;
    }

    async function syncPreorderToReservation(tableId, preorder) {
        if (!tableId || tableId === 'Mang về') return;

        try {
            const response = await request(`${RESERVATIONS_API_URL}?page=1&pageSize=200&sortBy=createdAt&sortOrder=desc`);
            const reservations = Array.isArray(response?.items) ? response.items : [];
            const targetReservation = reservations.find(reservation =>
                String(reservation.tableId) === String(tableId)
                && (reservation.status === 'Đã xác nhận' || reservation.status === 'Đã đến')
            );

            if (!targetReservation) return;

            const payload = {
                id: targetReservation.id,
                customerId: targetReservation.customerId,
                tableId: targetReservation.tableId,
                reservationDate: targetReservation.reservationDate,
                reservationTime: targetReservation.reservationTime,
                guestCount: targetReservation.guestCount,
                status: targetReservation.status,
                notes: buildReservationNotesWithPreorder(targetReservation.notes, preorder),
                createdAt: targetReservation.createdAt,
                updatedAt: new Date().toISOString()
            };

            await request(`${RESERVATIONS_API_URL}/${encodeURIComponent(targetReservation.id)}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.warn('Không thể đồng bộ pre-order vào reservation:', error.message);
        }
    }

    function hasActiveReservation(tableId) {
        if (!tableId || tableId === 'Mang về') return false;
        if (String(sessionStorage.getItem('bookedTable') || '') === String(tableId)) return true;
        const reservations = JSON.parse(localStorage.getItem('bistro_reservations') || '[]');
        return reservations.some(reservation => String(reservation.tableId) === String(tableId));
    }

    function mergePendingItems(targetItems, incomingCartItems) {
        incomingCartItems.forEach(cartItem => {
            const existingItem = targetItems.find(
                item => String(item.productId) === String(cartItem.id) || item.productName === cartItem.name
            );

            if (existingItem) {
                existingItem.quantity += Number(cartItem.quantity || 0);
                existingItem.totalPrice = Number(existingItem.unitPrice || 0) * Number(existingItem.quantity || 0);
                return;
            }

            const quantity = Number(cartItem.quantity || 0);
            const unitPrice = Number(cartItem.price || 0);
            targetItems.push({
                productId: Number(cartItem.id) || 0,
                productName: cartItem.name,
                quantity,
                unitPrice,
                totalPrice: unitPrice * quantity,
                notes: null
            });
        });
    }

    function renderDishRecommendations(response) {
        const section = ensureAiSuggestionSection();
        const summaryEl = section.querySelector('#ai-dish-summary');
        const listEl = section.querySelector('#ai-dish-list');
        const items = response?.items || [];

        if (summaryEl) {
            summaryEl.textContent = response?.summary || 'AI đang ưu tiên các món phù hợp với lựa chọn hiện tại.';
        }

        if (!listEl) return;

        if (items.length === 0) {
            listEl.innerHTML = '<p class="body-text" style="grid-column: 1 / -1;">Chưa có gợi ý phù hợp ở thời điểm này.</p>';
            return;
        }

        listEl.innerHTML = items.map(item => `
            <article class="menu-row">
                <div class="img-wrap">
                    <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'}" alt="${item.name}" loading="lazy">
                </div>
                <div class="item-content">
                    <div class="item-header">
                        <div class="item-title-block">
                            <h3 class="item-title">${item.name}</h3>
                        </div>
                        <div class="item-action">
                            <div class="item-price">${Number(item.price || 0).toLocaleString('vi-VN')} ₫</div>
                            <button class="add-to-cart-btn" data-id="${item.id}" title="Thêm vào giỏ">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>
                    </div>
                    <p class="body-text">${item.reason || item.category || 'Món được AI đề xuất cho bạn.'}</p>
                </div>
            </article>
        `).join('');
    }

    async function loadDishRecommendations() {
        const section = ensureAiSuggestionSection();
        const summaryEl = section.querySelector('#ai-dish-summary');
        const listEl = section.querySelector('#ai-dish-list');
        if (summaryEl) {
            summaryEl.textContent = 'DeepSeek đang phân tích các món phù hợp với giỏ hàng và bối cảnh hiện tại.';
        }
        if (listEl) {
            listEl.innerHTML = '<p class="body-text" style="grid-column: 1 / -1;">Đang tạo gợi ý món ăn...</p>';
        }

        try {
            const cart = getCurrentCart();
            const response = await request(`${AI_RECOMMENDATIONS_URL}/dishes`, {
                method: 'POST',
                body: JSON.stringify({
                    currentCartProductIds: cart.map(item => Number(item.id)).filter(Number.isFinite),
                    customerName: sessionStorage.getItem('customerName') || null,
                    diningTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    tableId: Number(sessionStorage.getItem('bookedTable') || 0) || null,
                    maxResults: 3
                })
            });
            renderDishRecommendations(response);
        } catch (err) {
            console.warn('Không thể tải gợi ý món AI:', err.message);
            if (summaryEl) {
                summaryEl.textContent = 'Không tải được gợi ý AI lúc này.';
            }
            if (listEl) {
                listEl.innerHTML = '<p class="body-text" style="grid-column: 1 / -1;">Bạn vẫn có thể chọn món trực tiếp từ thực đơn bên dưới.</p>';
            }
        }
    }

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

    await loadDishRecommendations();


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
        loadDishRecommendations();
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
        loadDishRecommendations();
    });


    document.getElementById('checkout-btn').addEventListener('click', async () => {
        const cart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
        if (cart.length === 0) return;

        const cTable = sessionStorage.getItem('bookedTable') || 'Mang về';
        const cCustomerId = sessionStorage.getItem('bookedCustomerId') || null;
        const cName = sessionStorage.getItem('customerName') || 'Quý khách';
        const finalTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shouldStagePreorder = hasActiveReservation(cTable);

        let existingOrders = JSON.parse(localStorage.getItem('bistro_orders') || '[]');

        if (shouldStagePreorder) {
            const pendingPreorders = readPendingPreorders();
            const existingPreorder = pendingPreorders.find(preorder => String(preorder.tableId) === String(cTable));
            let stagedPreorder = null;

            if (existingPreorder) {
                mergePendingItems(existingPreorder.items, cart);
                existingPreorder.total = Number(existingPreorder.items.reduce(
                    (sum, item) => sum + Number(item.totalPrice || 0),
                    0
                ));
                existingPreorder.itemsCount = Number(existingPreorder.items.reduce(
                    (sum, item) => sum + Number(item.quantity || 0),
                    0
                ));
                existingPreorder.customerId = existingPreorder.customerId || cCustomerId;
                existingPreorder.customerName = existingPreorder.customerName || cName;
                existingPreorder.updatedAt = new Date().toISOString();
                stagedPreorder = existingPreorder;
            } else {
                stagedPreorder = {
                    tableId: Number(cTable) || cTable,
                    customerId: cCustomerId,
                    customerName: cName,
                    itemsCount: cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
                    total: Number(finalTotal),
                    items: cart.map(item => {
                        const quantity = Number(item.quantity || 0);
                        const unitPrice = Number(item.price || 0);
                        return {
                            productId: Number(item.id) || 0,
                            productName: item.name,
                            quantity,
                            unitPrice,
                            totalPrice: unitPrice * quantity,
                            notes: null
                        };
                    }),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                pendingPreorders.unshift(stagedPreorder);
            }

            writePendingPreorders(pendingPreorders);
            await syncPreorderToReservation(cTable, stagedPreorder);

            const msgEl = document.getElementById('order-success-msg');
            msgEl.innerHTML = `Cảm ơn <b>${cName}</b>.<br/>Món ăn đã được ghi nhận trước. Hóa đơn sẽ được tạo khi nhà hàng nhận bàn.`;

            const modal = document.getElementById('order-success-modal');
            modal.style.opacity = '1';
            modal.style.pointerEvents = 'auto';
            modal.querySelector('div').style.transform = 'translateY(0)';

            localStorage.setItem('bistro_customer_cart', JSON.stringify([]));
            window.updateCartUI();
            loadDishRecommendations();
            document.getElementById('close-cart').click();
            return;
        }

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
            const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
            const orderItems = cart.map(item => {
                const productId = Number(item.id);
                const quantity = Number(item.quantity || 1);
                const unitPrice = Number(item.price || 0);

                return {
                    OrderId: orderId,
                    ProductId: Number.isFinite(productId) ? productId : 0,
                    ProductName: item.name,
                    Quantity: quantity,
                    UnitPrice: unitPrice,
                    TotalPrice: unitPrice * quantity,
                    Notes: null,
                    CreatedAt: new Date().toISOString()
                };
            });

            const newOrder = {
                Id: orderId,
                CustomerId: cCustomerId,
                AccountId: null,
                TableId: cTable !== 'Mang về' ? Number(cTable) : null,
                Status: ORDER_STATUSES.PENDING_CONFIRMATION,
                Subtotal: Number(finalTotal),
                Discount: 0,
                Total: Number(finalTotal),
                PaymentMethod: 'cash',
                PaymentStatus: 'pending',
                Notes: null,
                CreatedAt: new Date().toISOString(),
                UpdatedAt: new Date().toISOString(),
                OrderItems: orderItems
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
        loadDishRecommendations();
        document.getElementById('close-cart').click();
    });


    window.updateCartUI();
});
