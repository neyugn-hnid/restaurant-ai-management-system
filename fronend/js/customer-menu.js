document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    if (tableParam) {
        sessionStorage.setItem("bookedTable", tableParam);
    }

    // Check if categories and products are parsed correctly
    let categories = JSON.parse(localStorage.getItem('bistro_categories') || '[]');
    let products = JSON.parse(localStorage.getItem('bistro_products') || '[]');
    
    // In case localstorage was overridden with old data:
    if(!categories.find(c => c._id === 'starters')) {
        categories = window.BistroMockData.MOCK_CATEGORIES;
        products = window.BistroMockData.MOCK_PRODUCTS;
    }

    const menuContainer = document.querySelector('main');
    
    // Find where the first section starts:
    const sections = Array.from(document.querySelectorAll('section.menu-stage'));
    if (sections.length > 0) {
        sections.forEach(s => s.remove());
    }

    // Insert new sections
    categories.forEach((cat, index) => {
        const catProducts = products.filter(p => p.categoryId === cat.id);
        
        const section = document.createElement('section');
        section.className = 'menu-stage';
        section.id = cat._id || `cat-${cat.id}`;
        
        let headerHTML = `
            <div class="stage-header">
                <h2 class="stage-title">${cat.name}</h2>
                <span class="stage-desc">${cat.description}</span>
            </div>
        `;
        
        let gridHTML = `<div class="menu-grid">`;
        
        catProducts.forEach(prod => {
            gridHTML += `
                <article class="menu-row">
                    <div class="img-wrap"><img src="${prod.image}" alt="${prod.name}" referrerpolicy="no-referrer"></div>
                    <div class="item-content">
                        <div class="item-header">
                            <div class="item-title-block"><h3 class="item-title">${prod.name}</h3></div>
                            <div class="item-action">
                                <div class="item-price">${prod.price.toLocaleString('vi-VN')} ₫</div>
                                <button class="add-to-cart-btn" data-id="${prod.id}" title="Thêm vào giỏ">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </button>
                            </div>
                        </div>
                        <p class="body-text">${prod.description}</p>
                    </div>
                </article>
            `;
        });
        
        gridHTML += `</div>`;
        
        // Add pagination wrap if needed for UI matching
        gridHTML += `
            <div class="pagination-wrap">
                <button class="page-btn prev-btn" disabled><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
                <button class="page-btn next-btn"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
            </div>
        `;
        
        section.innerHTML = headerHTML + gridHTML;
        
        // Append before VIP promo banner if exists
        const promo = document.querySelector('.promo-vip');
        if (promo && index >= 2) {
            menuContainer.insertBefore(section, null); // append after everything
        } else if (promo && index < 2) {
            menuContainer.insertBefore(section, promo);
        } else {
            menuContainer.appendChild(section);
        }
    });

    // Update filter tags
    const filterIslandWrap = document.querySelector('.menu-filter-island');
    if (filterIslandWrap) {
        filterIslandWrap.innerHTML = '';
        categories.forEach((cat, index) => {
            const btn = document.createElement('a');
            btn.href = `#${cat._id || `cat-${cat.id}`}`;
            btn.className = `filter-tag ${index === 0 ? 'active' : ''}`;
            btn.textContent = cat.name;
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // update active state
                document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                
                // smooth scroll
                const target = document.getElementById(cat._id || `cat-${cat.id}`);
                if (target) {
                    const offset = target.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top: offset, behavior: 'smooth' });
                }
            });
            
            filterIslandWrap.appendChild(btn);
        });

        // Use scroll event for robust spy navigation
        window.addEventListener('scroll', () => {
            let currentId = '';
            const sections = document.querySelectorAll('section.menu-stage');
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                // Offset calculation (approx nav bar height + some padding)
                if (pageYOffset >= sectionTop - 150) {
                    currentId = section.getAttribute('id');
                }
            });

            if (currentId) {
                document.querySelectorAll('.filter-tag').forEach(t => {
                    if (t.getAttribute('href') === `#${currentId}`) {
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

    // Add To Cart Logic
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prodId = parseInt(e.currentTarget.getAttribute('data-id'));
            const product = products.find(p => p.id === prodId);
            
            if (product) {
                // Fly animation
                const btnClicked = e.currentTarget;
                const article = btnClicked.closest('article');
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
                    
                    // Trigger reflow
                    copy.getBoundingClientRect();
                    
                    // Animate to cart
                    copy.style.left = `${cartRect.left + 10}px`;
                    copy.style.top = `${cartRect.top + 10}px`;
                    copy.style.width = '40px';
                    copy.style.height = '40px';
                    copy.style.opacity = '0.3';
                    copy.style.transform = 'scale(0.2) rotate(360deg)';
                    
                    setTimeout(() => {
                        copy.remove();
                        // cart bump
                        cartBtn.style.transform = 'scale(1.15)';
                        setTimeout(() => cartBtn.style.transform = 'scale(1)', 200);
                    }, 600);
                }

                // Get current cart
                let currentCart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
                const existing = currentCart.find(item => item.id === prodId);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    currentCart.push({
                        ...product,
                        quantity: 1
                    });
                }
                
                localStorage.setItem('bistro_customer_cart', JSON.stringify(currentCart));
                
                if (typeof updateCartUI === "function") updateCartUI();
            }
        });
    });

    // --- CART UI & LOGIC ---
    const cartButton = document.createElement("div");
    cartButton.innerHTML = `
      <div id="floating-cart" style="position: fixed; bottom: 30px; right: 30px; background: var(--color-house-green); color: white; width: 64px; height: 64px; border-radius: 50%; box-shadow: 0 10px 40px rgba(0,0,0,0.3); cursor: pointer; z-index: 1000; display: flex; align-items: center; justify-content: center; transition: transform 0.3s, opacity 0.3s; opacity: 0; pointer-events: none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 26px; height: 26px;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
        <span id="cart-badge" style="position: absolute; top: -2px; right: -2px; background: var(--color-gold); color: white; font-size: 1.3rem; font-weight: 700; min-width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">0</span>
      </div>
      
      <div id="cart-modal" style="position: fixed; top: 0; right: 0; width: 100%; max-width: 400px; height: 100%; background: white; box-shadow: -10px 0 40px rgba(0,0,0,0.1); z-index: 1001; transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column;">
        <div style="padding: 2.4rem; background: var(--color-house-green); color: white; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: white;">Giỏ hàng <span id="cart-modal-count" style="font-size: 1.6rem; font-weight: normal; opacity: 0.9;"></span></h3>
          <span id="close-cart" style="cursor: pointer; font-size: 2.4rem; line-height: 1;">&times;</span>
        </div>
        <div id="cart-items" style="flex: 1; overflow-y: auto; padding: 2.4rem; background: #faf9f6; display: flex; flex-direction: column; gap: 1.6rem;">
          <!-- Items will be injected here -->
        </div>
        <div style="padding: 2.4rem; background: white; border-top: 1px solid #eee;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2.4rem; font-size: 1.8rem; font-weight: 700; color: var(--color-house-green);">
            <span>Tổng cộng</span>
            <span id="cart-final-total">0 ₫</span>
          </div>
          <button id="cart-checkout" class="btn btn-primary" style="width: 100%; padding: 1.6rem;">Đặt Món Ngay</button>
        </div>
      </div>
      <div id="cart-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; opacity: 0; pointer-events: none; transition: opacity 0.4s;"></div>
    `;
    document.body.appendChild(cartButton);

    function updateCartUI() {
      let currentCart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
      const fcBtn = document.getElementById("floating-cart");
      if (currentCart.length > 0) {
        fcBtn.style.opacity = '1';
        fcBtn.style.pointerEvents = 'auto';
      } else {
        fcBtn.style.opacity = '0';
        fcBtn.style.pointerEvents = 'none';
      }

      let total = 0;
      let count = 0;
      const itemsContainer = document.getElementById("cart-items");
      itemsContainer.innerHTML = '';
      
      if(currentCart.length === 0){
        itemsContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-muted); margin-top: 2rem;">Chưa có món nào được chọn</p>';
      }

      currentCart.forEach((item, index) => {
        total += item.price * item.quantity;
        count += item.quantity;

        const el = document.createElement("div");
        el.style.cssText = "background: white; padding: 1.6rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;";
        el.innerHTML = `
          <div style="flex: 1; min-width: 0; padding-right: 1.6rem;">
            <h4 style="margin: 0 0 0.4rem 0; font-size: 1.4rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${item.name}</h4>
            <div style="color: var(--color-gold); font-weight: 600;">${item.price.toLocaleString('vi-VN')} ₫</div>
          </div>
          <div style="display: flex; align-items: center; gap: 1.2rem; background: #f5f5f5; border-radius: 100px; padding: 0.4rem 0.8rem;">
            <button class="qty-btn" data-index="${index}" data-change="-1" style="border: none; background: transparent; cursor: pointer; font-size: 1.6rem; padding: 0 0.8rem;">-</button>
            <span style="font-weight: 600; font-size: 1.4rem; min-width: 2rem; text-align: center;">${item.quantity}</span>
            <button class="qty-btn" data-index="${index}" data-change="1" style="border: none; background: transparent; cursor: pointer; font-size: 1.6rem; padding: 0 0.8rem;">+</button>
          </div>
        `;
        itemsContainer.appendChild(el);
      });

      document.querySelectorAll('.qty-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
              const idx = parseInt(e.currentTarget.getAttribute('data-index'));
              const change = parseInt(e.currentTarget.getAttribute('data-change'));
              
              let cart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
              cart[idx].quantity += change;
              if(cart[idx].quantity <= 0) {
                  cart.splice(idx, 1);
              }
              localStorage.setItem('bistro_customer_cart', JSON.stringify(cart));
              updateCartUI();
          });
      });

      document.getElementById("cart-badge").innerText = count;
      if (document.getElementById("cart-modal-count")) {
          document.getElementById("cart-modal-count").innerText = `(${count} món)`;
      }
      document.getElementById("cart-final-total").innerText = `${total.toLocaleString('vi-VN')} ₫`;
    }

    // Call once to initialize
    updateCartUI();

    document.getElementById("floating-cart").addEventListener("click", () => {
      document.getElementById("cart-modal").style.transform = "translateX(0)";
      document.getElementById("cart-overlay").style.opacity = "1";
      document.getElementById("cart-overlay").style.pointerEvents = "auto";
    });

    document.getElementById("close-cart").addEventListener("click", () => {
      document.getElementById("cart-modal").style.transform = "translateX(100%)";
      document.getElementById("cart-overlay").style.opacity = "0";
      document.getElementById("cart-overlay").style.pointerEvents = "none";
    });
    
    document.getElementById("cart-overlay").addEventListener("click", () => {
      document.getElementById("close-cart").click();
    });

    // --- ORDER SUCCESS MODAL ---
    const orderModalWrapper = document.createElement("div");
    orderModalWrapper.innerHTML = `
      <div id="order-success-modal" style="position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); opacity: 0; pointer-events: none; transition: 0.3s;">
        <div style="background: white; padding: 3.2rem; border-radius: 12px; max-width: 450px; width: 90%; text-align: center; box-shadow: 0 24px 48px rgba(0,0,0,0.2); transform: translateY(20px); transition: transform 0.3s; color: var(--color-text);">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" stroke-width="2" style="width: 80px; height: 80px; margin: 0 auto 2.4rem;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h3 style="font-family: var(--font-main); font-size: 2.8rem; color: var(--color-gold); margin-bottom: 1.6rem; font-weight: 700;">Đặt Món Thành Công</h3>
          <p id="order-success-msg" style="font-size: 1.6rem; line-height: 1.6; margin-bottom: 3.2rem; color: var(--color-text-muted);">
            <!-- will be populated -->
          </p>
          <button id="close-success-btn" class="btn btn-primary" style="width: 100%;">Quay Về Trang Chủ</button>
        </div>
      </div>
    `;
    document.body.appendChild(orderModalWrapper);

    document.getElementById("close-success-btn").addEventListener("click", () => {
      document.getElementById("order-success-modal").style.opacity = "0";
      document.getElementById("order-success-modal").style.pointerEvents = "none";
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    });

    document.getElementById("cart-checkout").addEventListener("click", () => {
      let currentCart = JSON.parse(localStorage.getItem('bistro_customer_cart') || '[]');
      if(currentCart.length === 0) return;
      
      const cName = sessionStorage.getItem("customerName") || "Quý khách";
      const cTable = sessionStorage.getItem("bookedTable") || "Mang về";

      // Sync to staff dashboard
      const existingOrders = JSON.parse(localStorage.getItem("bistro_orders") || "[]");

      const activeOrderIndex = existingOrders.findIndex(
          (o) =>
              cTable !== "Mang về" &&
              o.customer.toLowerCase().includes(cTable.toLowerCase()) &&
              o.status !== "Hoàn thành" &&
              o.status !== "Hủy",
      );

      let finalTotal = currentCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      if (activeOrderIndex !== -1) {
          const activeOrder = existingOrders[activeOrderIndex];
          
          currentCart.forEach((cartItem) => {
              const existingItem = activeOrder.items.find((i) => i.name === cartItem.name);
              if (existingItem) {
                  existingItem.quantity += cartItem.quantity;
              } else {
                  activeOrder.items.push({
                      name: cartItem.name,
                      quantity: cartItem.quantity,
                      price: cartItem.price,
                  });
              }
          });

          activeOrder.itemsCount += currentCart.reduce((sum, item) => sum + item.quantity, 0);
          activeOrder.total += finalTotal;
          activeOrder.status = "Chờ xác nhận";
          activeOrder.statusClass = "bg-warning bg-opacity-10 text-warning border-warning";
          activeOrder.time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

          existingOrders[activeOrderIndex] = activeOrder;
      } else {
          const newOrder = {
              id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
              time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
              date: new Date().toLocaleDateString("vi-VN"),
              customer: cTable,
              customerIcon: cTable === "Mang về" ? "local_mall" : "table_restaurant",
              customerSubtext: cName !== "Quý khách" ? cName : "Từ QR Khách hàng",
              itemsCount: currentCart.reduce((sum, item) => sum + item.quantity, 0),
              items: currentCart.map((item) => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
              })),
              total: finalTotal,
              status: "Chờ xác nhận",
              statusClass: "bg-warning bg-opacity-10 text-warning border-warning",
          };
          existingOrders.unshift(newOrder);
      }

      localStorage.setItem("bistro_orders", JSON.stringify(existingOrders));

      const msgEl = document.getElementById("order-success-msg");
      msgEl.innerHTML = `Cảm ơn <b>${cName}</b>.<br/>Các món ăn đã được gửi yêu cầu lên hệ thống. Bếp sẽ chuẩn bị ngay nhé, nếu có thay đổi xin vui lòng gọi đến số điện thoại quy định.`;

      const modal = document.getElementById("order-success-modal");
      modal.style.opacity = "1";
      modal.style.pointerEvents = "auto";
      modal.querySelector("div").style.transform = "translateY(0)";

      localStorage.setItem('bistro_customer_cart', JSON.stringify([]));
      updateCartUI();
      document.getElementById("close-cart").click();
    });
});
