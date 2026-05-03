import { GoogleGenAI, Type } from "@google/genai";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Khởi tạo dữ liệu
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
  const tableNum = urlParams.get("table") || "Khách vãng lai";
  document.getElementById("tableNumber").textContent = `Bàn: ${tableNum}`;

  const menuItems = [
    {
      id: 1,
      name: "Cà phê Phin sữa đá",
      price: 29000,
      category: "Cà phê",
      img: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=200&h=200&fit=crop",
    },
    {
      id: 2,
      name: "Cold Brew Truyền Thống",
      price: 45000,
      category: "Cà phê",
      img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop",
    },
    {
      id: 3,
      name: "Trà Đào Cam Sả",
      price: 49000,
      category: "Trà & Đá xay",
      img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=200&h=200&fit=crop",
    },
    {
      id: 4,
      name: "Bánh Mì Thịt Nướng",
      price: 45000,
      category: "Món ăn nhẹ",
      img: "https://images.unsplash.com/photo-1509722350103-64372e27e8d0?w=200&h=200&fit=crop",
    },
    {
      id: 5,
      name: "Croissant Phô Mai",
      price: 35000,
      category: "Bánh ngọt",
      img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200&h=200&fit=crop",
    },
    {
      id: 6,
      name: "Matcha Đá Xay",
      price: 55000,
      category: "Trà & Đá xay",
      img: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=200&h=200&fit=crop",
    },
  ];

  let cart = [];

  // 2. Render thực đơn
  const menuList = document.getElementById("menuList");
  function renderMenu(items) {
    menuList.innerHTML = items
      .map(
        (item) => `
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
                    <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">add</span>
                </button>
            </div>
        `,
      )
      .join("");
  }
  renderMenu(menuItems);

  // --- QUẢN LÝ DỮ LIỆU CÁ NHÂN HÓA (LocalStorage) ---
  const STORAGE_KEY_HISTORY = "bistro_customer_history";
  const STORAGE_KEY_POPULARITY = "bistro_item_popularity";

  function getHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_HISTORY) || "[]");
  }

  function saveToHistory(items) {
    const history = getHistory();
    const newHistory = [...new Set([...history, ...items.map((i) => i.name)])];
    localStorage.setItem(
      STORAGE_KEY_HISTORY,
      JSON.stringify(newHistory.slice(-10)),
    ); // Lưu 10 món gần nhất
  }

  function getPopularity() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_POPULARITY) || "{}");
  }

  function updatePopularity(items) {
    const popularity = getPopularity();
    items.forEach((item) => {
      popularity[item.name] = (popularity[item.name] || 0) + item.qty;
    });
    localStorage.setItem(STORAGE_KEY_POPULARITY, JSON.stringify(popularity));
  }

  function getTopPopular() {
    const popularity = getPopularity();
    return Object.entries(popularity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0]);
  }

  // AI Recommendation Logic - Advanced Version
  async function getAIRecommendations() {
    const suggestionSection = document.getElementById(
      "ai-recommendation-section",
    );
    const suggestionsList = document.getElementById("ai-suggestions-list");

    const now = new Date();
    const hour = now.getHours();
    let timeContext = "buổi sáng (ưu tiên năng lượng)";
    if (hour >= 11 && hour < 14)
      timeContext = "buổi trưa (ưu tiên nhanh, no bụng)";
    if (hour >= 14 && hour < 17)
      timeContext = "buổi chiều (ưu tiên ăn nhẹ, trà bánh)";
    if (hour >= 17) timeContext = "buổi tối (ưu tiên thư giãn, lẩu/nướng)";

    const currentCartNames = cart.map((i) => i.name);
    const historyNames = getHistory();
    const topPopular = getTopPopular();

    try {
      if (!ai) {
          console.warn("AI is not initialized, skipping recommendations.");
          return;
      }
      const prompt = `Bạn là chuyên gia gợi ý thực đơn (Menu recommender).
            CONTEXT:
            - Thời gian: ${timeContext}
            - Giỏ hàng hiện tại (để gợi ý COMBO phù hợp): ${currentCartNames.join(", ") || "Trống"}
            - Lịch sử khách này đã từng gọi: ${historyNames.join(", ") || "Khách mới"}
            - Top món bán chạy tại quán: ${topPopular.join(", ") || "Chưa có"}
            
            MENU CỦA QUÁN:
            ${JSON.stringify(menuItems.map((m) => ({ id: m.id, name: m.name, category: m.category })))}

            NHIỆM VỤ:
            Dựa trên 4 ý tưởng: 
            1. Suggest combo hoàn hảo với những gì đang có trong giỏ hàng.
            2. Suggest dựa trên món khách thường ăn hoặc món tương tự.
            3. Suggest món đang HOT/phổ biến nhất.
            4. Phải đúng với thời gian thực tế hiện tại.

            Hãy chọn ra 3 món tốt nhất. Chỉ trả về JSON mảng ID các món.
            JSON Format: [id1, id2, id3]`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
          },
        },
      });

      const recommendedIds = JSON.parse(response.text.trim());
      const recommendedItems = menuItems.filter((item) =>
        recommendedIds.includes(item.id),
      );

      if (recommendedItems.length > 0) {
        suggestionSection.style.display = "block";
        suggestionsList.innerHTML = recommendedItems
          .map(
            (item) => `
                    <div class="bg-white rounded-4 p-3 shadow-sm d-flex flex-column gap-2" style="min-width: 160px; border: 1px solid var(--sb-ceramic);">
                        <div class="position-relative">
                            <img src="${item.img}" class="rounded-3" style="width: 100%; height: 100px; object-fit: cover;">
                            <div class="position-absolute top-0 start-0 m-1">
                                <span class="badge rounded-pill bg-primary" style="font-size: 0.6rem;">AI Gợi ý</span>
                            </div>
                        </div>
                        <div>
                            <div class="fw-bold small text-truncate" style="color: var(--sb-house-green);">${item.name}</div>
                            <div class="text-success fw-bold small">${new Intl.NumberFormat("vi-VN").format(item.price)}đ</div>
                        </div>
                        <button class="btn btn-sm btn-outline-success rounded-pill fw-bold" onclick="addToCart(${item.id}, event)">
                            + Thêm ngay
                        </button>
                    </div>
                `,
          )
          .join("");
      }
    } catch (error) {
      console.error("AI Recommendation Error:", error);
    }
  }

  getAIRecommendations();

  window.addToCart = (id, event) => {
    const item = menuItems.find((i) => i.id === id);
    const existing = cart.find((c) => c.id === id);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ ...item, qty: 1 });
    }

    // --- Animation Logic ---
    if (event && event.target) {
      updateCartUI(false); // Update without bouncing

      const btn = event.target.closest(".add-btn");
      const card =
        event.target.closest(".menu-item-card") ||
        event.target.closest(".bg-white"); // for AI suggestion
      const imgEl = card ? card.querySelector("img") : null;

      if (imgEl && btn) {
        // Get coordinates
        const imgRect = imgEl.getBoundingClientRect();

        // create flying element
        const flyingImg = imgEl.cloneNode(true);

        // Style flying element to overlay exactly on the original image initially
        flyingImg.style.position = "fixed";
        flyingImg.style.top = imgRect.top + "px";
        flyingImg.style.left = imgRect.left + "px";
        flyingImg.style.width = imgRect.width + "px";
        flyingImg.style.height = imgRect.height + "px";
        flyingImg.style.borderRadius = "50%"; // Make it a circle
        flyingImg.style.objectFit = "cover";
        flyingImg.style.zIndex = "9999";
        flyingImg.style.transition =
          "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

        document.body.appendChild(flyingImg);

        // Provide target cart coordinates
        // Fallback to center bottom if cart nav not visible
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

        // Trigger reflow
        flyingImg.offsetHeight;

        // Start animation
        flyingImg.style.top = targetY + "px";
        flyingImg.style.left = targetX + "px";
        flyingImg.style.width = "20px";
        flyingImg.style.height = "20px";
        flyingImg.style.opacity = "0";

        // Remove element after animation
        setTimeout(() => {
          if (document.body.contains(flyingImg)) {
            document.body.removeChild(flyingImg);
          }
          updateCartUI(true);
        }, 600);
      } else {
        updateCartUI(true);
      }
    } else {
      updateCartUI(true);
    }

    vibrate();

    // Cập nhật lại gợi ý khi giỏ hàng đổi (Để tính toán Combo)
    getAIRecommendations();
  };

  function updateCartUI(shouldBounce = true) {
    const bottomNav = document.getElementById("floatingCartBtn");
    const countEl = document.getElementById("cartCount");
    const totalEl = document.getElementById("cartTotal");

    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );

    if (totalCount > 0) {
      bottomNav.style.display = "flex";
      // Simple animation trigger
      bottomNav.style.animation = "none";
      bottomNav.offsetHeight; /* trigger reflow */
      bottomNav.style.animation = null;

      countEl.textContent = totalCount;
      if (totalEl)
        totalEl.textContent =
          new Intl.NumberFormat("vi-VN").format(totalPrice) + "đ";

      if (shouldBounce) {
        const wrapper = document.getElementById("floatingCartBtn");
        if (wrapper) {
          wrapper.classList.remove("cart-bounce-animation");
          void wrapper.offsetWidth; // trigger reflow
          wrapper.classList.add("cart-bounce-animation");
        }
      }
    } else {
      bottomNav.style.display = "none";
    }
  }

  // --- DEMO CUSTOMER LOGIN ---
  let currentCustomer = null;
  const demoModalEl = document.getElementById("customerDemoModal");
  if (demoModalEl) {
    const customerDemoModal = new bootstrap.Modal(demoModalEl);

    // Always show modal for demo purposes
    customerDemoModal.show();
    
    // Auto-fill if exists
    const activeCustomer = sessionStorage.getItem("current_demo_customer");
    if (activeCustomer) {
      currentCustomer = JSON.parse(activeCustomer);
      document.getElementById("demoCustomerName").value = currentCustomer.name || "";
      document.getElementById("demoCustomerPhone").value = currentCustomer.phone || "";
    }

    document
      .getElementById("customerDemoForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("demoCustomerName").value.trim();
        const phone = document.getElementById("demoCustomerPhone").value.trim();

        let allCustomers = JSON.parse(
          localStorage.getItem("bistro_customers") || "[]",
        );
        let cust = allCustomers.find((c) => c.phone === phone);

        if (cust) {
          // Exists: increment visits
          cust.visits = (cust.visits || 0) + 1;
          cust.tier = calculateTier(cust.totalSpent || 0);
          if (cust.name !== name) cust.name = name; // Update name to newest
        } else {
          // New
          cust = {
            id: "KH" + String(Date.now()).slice(-4),
            name: name,
            phone: phone,
            visits: 1,
            totalSpent: 0,
            tier: "new",
            createdAt: new Date().toISOString()
          };
          allCustomers.unshift(cust); // Add to beginning
        }

        localStorage.setItem("bistro_customers", JSON.stringify(allCustomers));
        sessionStorage.setItem("current_demo_customer", JSON.stringify(cust));
        currentCustomer = cust;

        // Update welcome text
        const welcomeText = document.getElementById('welcomeText');
        if (welcomeText) {
             welcomeText.innerHTML = `Chào, ${name}!`;
        }

        customerDemoModal.hide();
        renderCartModal(); // re-render to apply new discount if cart has items
        getAIRecommendations(); // Re-trigger AI for fresh personalized feel
      });
  }

  function calculateTier(spent) {
    if (spent >= 10000000) return "platinum";
    if (spent >= 5000000) return "gold";
    if (spent >= 2000000) return "silver";
    return "new"; // or member
  }

  function getDiscountPercent(tier) {
    if (tier === "platinum") return 15;
    if (tier === "gold") return 10;
    if (tier === "silver") return 5;
    return 0;
  }

  // 4. Xem giỏ hàng
  const orderModal = new bootstrap.Modal(document.getElementById("orderModal"));

  window.decreaseQty = (id) => {
    const index = cart.findIndex((c) => c.id === id);
    if (index > -1) {
      cart[index].qty--;
      if (cart[index].qty <= 0) {
        cart.splice(index, 1);
      }
      updateCartUI(false);
      renderCartModal();
      if (cart.length === 0) {
        orderModal.hide();
      }
    }
  };

  window.increaseQty = (id) => {
    const item = cart.find((c) => c.id === id);
    if (item) {
      item.qty++;
      updateCartUI(false);
      renderCartModal();
    }
  };

  window.renderCartModal = () => {
    const list = document.getElementById("cartItemsList");
    const summaryBox = document.querySelector(".order-summary-box");
    if (!list) return;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    let discountPercent = currentCustomer
      ? getDiscountPercent(currentCustomer.tier)
      : 0;
    let discountAmount = Math.floor(subtotal * (discountPercent / 100));
    let total = subtotal - discountAmount;

    if (cart.length === 0) {
      list.innerHTML =
        '<div class="text-center py-4 text-muted">Giỏ hàng đang trống</div>';
    } else {
      list.innerHTML = cart
        .map(
          (item) => `
                <div class="cart-item-row d-flex justify-content-between align-items-center mb-3">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${item.img || item.image}" alt="${item.name}" class="rounded-3" style="width: 50px; height: 50px; object-fit: cover;">
                        <div style="max-width: 140px;">
                            <div class="fw-bold text-truncate" style="color: var(--sb-house-green);">${item.name}</div>
                            <div class="fw-bold text-dark mt-1">${new Intl.NumberFormat("vi-VN").format(item.price * item.qty)}đ</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center bg-light shadow-sm rounded-pill px-2 py-1">
                        <button class="btn btn-sm text-secondary p-1 border-0" onclick="decreaseQty(${item.id})">
                            <span class="material-symbols-outlined fs-6 d-block">${item.qty === 1 ? "delete" : "remove"}</span>
                        </button>
                        <span class="fw-bold mx-1" style="min-width: 24px; text-align: center;">${item.qty}</span>
                        <button class="btn btn-sm text-success p-1 border-0" onclick="increaseQty(${item.id})">
                            <span class="material-symbols-outlined fs-6 d-block">add</span>
                        </button>
                    </div>
                </div>
            `,
        )
        .join("");
    }

    if (summaryBox) {
      let discountHtml = "";
      if (discountPercent > 0) {
        let tierName =
          currentCustomer.tier === "platinum"
            ? "Kim Cương"
            : currentCustomer.tier === "gold"
              ? "Vàng"
              : "Bạc";
        discountHtml = `
            <div class="d-flex justify-content-between mb-2 text-danger">
                <span class="fw-medium">Khách hàng ${tierName} (-${discountPercent}%)</span>
                <span class="fw-bold">-${new Intl.NumberFormat("vi-VN").format(discountAmount)}đ</span>
            </div>
            `;
      }

      summaryBox.innerHTML = `
            <div class="d-flex justify-content-between mb-2">
                <span class="text-secondary fw-medium">Tạm tính</span>
                <span class="fw-bold" id="modalSubtotal">${new Intl.NumberFormat("vi-VN").format(subtotal)}đ</span>
            </div>
            ${discountHtml}
            <div class="d-flex justify-content-between mb-3 text-success">
                <span class="fw-medium">Phí dịch vụ</span>
                <span class="fw-bold">MIỄN PHÍ</span>
            </div>
            <div class="d-flex justify-content-between align-items-center pt-3 border-top border-dark border-opacity-10">
                <span class="fw-bold fs-5">Tổng cộng</span>
                <span class="fw-extrabold fs-3 text-primary" id="modalTotal" style="color: var(--sb-accent-green) !important;">${new Intl.NumberFormat("vi-VN").format(total)}đ</span>
            </div>
        `;
    }
  };

  document.getElementById("floatingCartBtn").addEventListener("click", () => {
    renderCartModal();
    orderModal.show();
  });

  // 5. Xác nhận đặt món
  document
    .getElementById("confirmOrderBtn")
    .addEventListener("click", function () {
      const btn = this;
      const originalText = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Đang gửi yêu cầu...
        `;

      // Giả lập gửi lên server
      setTimeout(() => {
        // Lưu vào lịch sử và cập nhật độ phổ biến trước khi xóa giỏ hàng
        saveToHistory(cart);
        updatePopularity(cart);

        // Calculate discount
        let orderSubtotal = cart.reduce(
          (sum, item) => sum + item.price * item.qty,
          0,
        );
        let discountPct = currentCustomer
          ? getDiscountPercent(currentCustomer.tier)
          : 0;
        let finalTotal =
          orderSubtotal - Math.floor(orderSubtotal * (discountPct / 100));

        // Update customer spending
        if (currentCustomer) {
          let allCustomers = JSON.parse(
            localStorage.getItem("bistro_customers") || "[]",
          );
          let idx = allCustomers.findIndex(
            (c) => c.phone === currentCustomer.phone,
          );
          if (idx !== -1) {
            allCustomers[idx].totalSpent =
              (allCustomers[idx].totalSpent || 0) + finalTotal;
            allCustomers[idx].tier = calculateTier(
              allCustomers[idx].totalSpent,
            );
            localStorage.setItem(
              "bistro_customers",
              JSON.stringify(allCustomers),
            );
            currentCustomer = allCustomers[idx];
            sessionStorage.setItem(
              "current_demo_customer",
              JSON.stringify(currentCustomer),
            );
          }
        }

        // Sync to staff dashboard
        const existingOrders = JSON.parse(
          localStorage.getItem("bistro_orders") || "[]",
        );

        // Tìm đơn hàng đang phục vụ của bàn này
        const activeOrderIndex = existingOrders.findIndex(
          (o) =>
            tableNum !== "Khách vãng lai" &&
            o.customer === tableNum &&
            o.status !== "Hoàn thành" &&
            o.status !== "Hủy",
        );

        if (activeOrderIndex !== -1) {
          // Đã có đơn hàng, gộp thêm món
          const activeOrder = existingOrders[activeOrderIndex];

          // Gộp món ăn
          cart.forEach((cartItem) => {
            const existingItem = activeOrder.items.find(
              (i) => i.name === cartItem.name,
            );
            if (existingItem) {
              existingItem.quantity += cartItem.qty;
            } else {
              activeOrder.items.push({
                name: cartItem.name,
                quantity: cartItem.qty,
                price: cartItem.price,
              });
            }
          });

          // Cập nhật tổng tiền và số lượng
          activeOrder.itemsCount += cart.reduce(
            (sum, item) => sum + item.qty,
            0,
          );
          activeOrder.total += finalTotal; // Add final discounted total instead of raw

          // Đổi trạng thái về chờ xác nhận để báo cho bếp biết có món mới
          activeOrder.status = "Chờ xác nhận";
          activeOrder.statusClass =
            "bg-warning bg-opacity-10 text-warning border-warning";

          // Cập nhật lại thời gian đặt thêm món
          activeOrder.time = new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          });

          existingOrders[activeOrderIndex] = activeOrder;
        } else {
          // Tạo đơn hàng mới
          const newOrder = {
            id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            time: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            date: new Date().toLocaleDateString("vi-VN"),
            customer: tableNum === "Khách vãng lai" ? "Mang về" : tableNum,
            customerIcon:
              tableNum === "Khách vãng lai" ? "local_mall" : "table_restaurant",
            customerSubtext: currentCustomer
              ? `${currentCustomer.name} - ${currentCustomer.phone}`
              : "Từ QR Khách hàng",
            itemsCount: cart.reduce((sum, item) => sum + item.qty, 0),
            items: cart.map((item) => ({
              name: item.name,
              quantity: item.qty,
              price: item.price,
            })),
            total: finalTotal, // Final discounted total
            status: "Chờ xác nhận",
            statusClass: "bg-warning bg-opacity-10 text-warning border-warning",
          };
          existingOrders.unshift(newOrder); // add to top
        }

        localStorage.setItem("bistro_orders", JSON.stringify(existingOrders));

        orderModal.hide();
        btn.disabled = false;
        btn.innerHTML = originalText;

        document.getElementById("toastMessage").innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <span class="material-symbols-outlined">check_circle</span>
                    Đã gửi yêu cầu đến bếp thành công!
                </div>
            `;
        const toast = new bootstrap.Toast(
          document.getElementById("orderToast"),
        );
        toast.show();

        cart = [];
        updateCartUI();
      }, 1500);
    });

  // 6. Xử lý Categories
  const categoryScroll = document.querySelector(".category-scroll");
  let isDown = false;
  let startX;
  let scrollLeft;

  if (categoryScroll) {
    categoryScroll.addEventListener("mousedown", (e) => {
      isDown = true;
      categoryScroll.style.cursor = "grabbing";
      startX = e.pageX - categoryScroll.offsetLeft;
      scrollLeft = categoryScroll.scrollLeft;
    });
    categoryScroll.addEventListener("mouseleave", () => {
      isDown = false;
      categoryScroll.style.cursor = "grab";
    });
    categoryScroll.addEventListener("mouseup", () => {
      isDown = false;
      categoryScroll.style.cursor = "grab";
    });
    categoryScroll.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - categoryScroll.offsetLeft;
      const walk = (x - startX) * 2; // Tốc độ cuộn
      categoryScroll.scrollLeft = scrollLeft - walk;
    });
    // Default cursor
    categoryScroll.style.cursor = "grab";
  }

  const aiSuggestionsList = document.getElementById("ai-suggestions-list");
  if (aiSuggestionsList) {
    let aiIsDown = false;
    let aiStartX;
    let aiScrollLeft;

    aiSuggestionsList.addEventListener("mousedown", (e) => {
      aiIsDown = true;
      aiSuggestionsList.style.cursor = "grabbing";
      aiStartX = e.pageX - aiSuggestionsList.offsetLeft;
      aiScrollLeft = aiSuggestionsList.scrollLeft;
    });
    aiSuggestionsList.addEventListener("mouseleave", () => {
      aiIsDown = false;
      aiSuggestionsList.style.cursor = "grab";
    });
    aiSuggestionsList.addEventListener("mouseup", () => {
      aiIsDown = false;
      aiSuggestionsList.style.cursor = "grab";
    });
    aiSuggestionsList.addEventListener("mousemove", (e) => {
      if (!aiIsDown) return;
      e.preventDefault();
      const x = e.pageX - aiSuggestionsList.offsetLeft;
      const walk = (x - aiStartX) * 2;
      aiSuggestionsList.scrollLeft = aiScrollLeft - walk;
    });
    aiSuggestionsList.style.cursor = "grab";
  }

  document.querySelectorAll(".category-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      document
        .querySelector(".category-pill.active")
        .classList.remove("active");
      pill.classList.add("active");
      const category = pill.textContent;
      if (category === "Tất cả") {
        renderMenu(menuItems);
      } else {
        renderMenu(menuItems.filter((i) => i.category === category));
      }
    });
  });

  function vibrate() {
    if (typeof window.navigator.vibrate === "function") {
      window.navigator.vibrate(50);
    }
  }
});
