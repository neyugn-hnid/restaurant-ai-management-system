let ordersData = [
  {
    id: "ORD-1042",
    time: "19:30",
    date: "24/10/2023",
    customer: "B\xE0n 12",
    customerIcon: "table_restaurant",
    customerSubtext: "",
    itemsCount: 4,
    items: [
      { name: "L\u1EA9u H\u1EA3i S\u1EA3n", quantity: 1, price: 65e4 },
      { name: "M\u1EF1c n\u01B0\u1EDBng sa t\u1EBF", quantity: 1, price: 35e4 },
      { name: "Salad ng\u0169 s\u1EAFc", quantity: 1, price: 15e4 },
      { name: "Bia Tiger", quantity: 6, price: 5e4 }
    ],
    total: 145e4,
    status: "Ch\u1EDD x\xE1c nh\u1EADn",
    statusClass: "bg-warning bg-opacity-10 text-warning border-warning"
  },
  {
    id: "ORD-1041",
    time: "19:15",
    date: "24/10/2023",
    customer: "B\xE0n VIP 2",
    customerIcon: "star",
    customerSubtext: "",
    itemsCount: 8,
    items: [
      { name: "Combo N\u01B0\u1EDBng Th\u01B0\u1EE3ng H\u1EA1ng", quantity: 1, price: 18e5 },
      { name: "R\u01B0\u1EE3u Vang \u0110\u1ECF", quantity: 1, price: 14e5 }
    ],
    total: 32e5,
    status: "\u0110ang ch\u1EBF bi\u1EBFn",
    statusClass: "bg-info bg-opacity-10 text-info border-info"
  },
  {
    id: "ORD-1040",
    time: "18:45",
    date: "24/10/2023",
    customer: "B\xE0n 08",
    customerIcon: "table_restaurant",
    customerSubtext: "Anh Minh",
    itemsCount: 3,
    items: [
      { name: "G\xE0 \u1EE6 Mu\u1ED1i", quantity: 1, price: 45e4 },
      { name: "C\u01A1m Chi\xEAn H\u1EA3i S\u1EA3n", quantity: 1, price: 25e4 },
      { name: "N\u01B0\u1EDBc Ng\u1ECDt", quantity: 5, price: 3e4 }
    ],
    total: 85e4,
    status: "\u0110\xE3 ph\u1EE5c v\u1EE5",
    statusClass: "bg-primary bg-opacity-10 text-primary border-primary"
  },
  {
    id: "ORD-1039",
    time: "18:10",
    date: "24/10/2023",
    customer: "Mang v\u1EC1",
    customerIcon: "local_mall",
    customerSubtext: "Ch\u1ECB Hoa (0901***123)",
    itemsCount: 2,
    items: [
      { name: "Ph\u1EDF \u0110\u1EB7c Bi\u1EC7t", quantity: 3, price: 8e4 },
      { name: "Tr\xE0 T\u1EAFc", quantity: 6, price: 3e4 }
    ],
    total: 42e4,
    status: "Ho\xE0n th\xE0nh",
    statusClass: "bg-success bg-opacity-10 text-success border-success"
  }
];
let currentFilter = "T\u1EA5t c\u1EA3";
let currentSearch = "";
let orderToDeleteId = null;
let orderToUpdateId = null;
function getStatusClass(status) {
  switch (status) {
    case "Ch\u1EDD x\xE1c nh\u1EADn":
      return "bg-warning bg-opacity-10 text-warning border-warning";
    case "\u0110ang ch\u1EBF bi\u1EBFn":
      return "bg-info bg-opacity-10 text-info border-info";
    case "\u0110\xE3 ph\u1EE5c v\u1EE5":
      return "bg-primary bg-opacity-10 text-primary border-primary";
    case "Ho\xE0n th\xE0nh":
      return "bg-success bg-opacity-10 text-success border-success";
    default:
      return "bg-secondary bg-opacity-10 text-secondary border-secondary";
  }
}
function getStatusIcon(status) {
  switch (status) {
    case "Ch\u1EDD x\xE1c nh\u1EADn":
      return "pending_actions";
    case "\u0110ang ch\u1EBF bi\u1EBFn":
      return "skillet";
    case "\u0110\xE3 ph\u1EE5c v\u1EE5":
      return "room_service";
    case "Ho\xE0n th\xE0nh":
      return "check_circle";
    default:
      return "help_outline";
  }
}
function renderOrders() {
  const tableBody = document.getElementById("ordersTableBody");
  if (!tableBody) return;
  tableBody.innerHTML = "";
  const filteredData = ordersData.filter((order) => {
    const matchesFilter = currentFilter === "T\u1EA5t c\u1EA3" || order.status === currentFilter;
    const matchesSearch = currentSearch === "" || order.id.toLowerCase().includes(currentSearch) || order.customer.toLowerCase().includes(currentSearch) || order.customerSubtext && order.customerSubtext.toLowerCase().includes(currentSearch);
    return matchesFilter && matchesSearch;
  });
  if (filteredData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary">Kh\xF4ng t\xECm th\u1EA5y \u0111\u01A1n h\xE0ng n\xE0o</td></tr>`;
  } else {
    filteredData.forEach((order) => {
      const formattedTotal = new Intl.NumberFormat("vi-VN").format(order.total) + " \u20AB";
      let customerHtml = `<div class="fw-medium text-dark d-flex align-items-center gap-2"><span class="material-symbols-outlined text-secondary fs-6">${order.customerIcon}</span> ${order.customer}</div>`;
      if (order.customerSubtext) {
        customerHtml += `<div class="small text-muted">${order.customerSubtext}</div>`;
      }
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td class="ps-4"><a href="#" class="text-decoration-none fw-semibold">#${order.id}</a></td>
                <td>
                    <div class="fw-medium text-dark">${order.time}</div>
                    <div class="small text-muted">${order.date}</div>
                </td>
                <td>
                    ${customerHtml}
                </td>
                <td>${order.itemsCount} m\xF3n</td>
                <td class="fw-bold text-dark">${formattedTotal}</td>
                <td><span class="badge ${order.statusClass} border px-2 py-1 rounded-pill d-inline-flex align-items-center">
                    <span class="material-symbols-outlined me-1" style="font-size: 14px !important;">${getStatusIcon(order.status)}</span>
                    ${order.status}
                </span></td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center payment-btn" data-id="${order.id}" data-total="${formattedTotal}" style="width: 32px; height: 32px; border-radius: 50%; color: #0d6efd !important; background-color: #fff !important;" title="Thanh to\xE1n QR" onmouseover="this.style.backgroundColor='#f0f7ff'" onmouseout="this.style.backgroundColor='#fff'">
                            <span class="material-symbols-outlined fs-6">qr_code_2</span>
                        </button>
                        <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center update-status-btn" data-id="${order.id}" style="width: 32px; height: 32px; border-radius: 50%; color: var(--text-soft) !important; background-color: #fff !important;" title="C\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i" onmouseover="this.style.backgroundColor='#f9f9f9'" onmouseout="this.style.backgroundColor='#fff'">
                            <span class="material-symbols-outlined fs-6">edit</span>
                        </button>
                        <button class="btn btn-light btn-icon border border-danger shadow-sm p-0 d-flex align-items-center justify-content-center text-danger delete-order-btn" data-id="${order.id}" style="width: 32px; height: 32px; border-radius: 50%; color: #dc3545 !important; background-color: #fff !important;" title="X\xF3a" onmouseover="this.style.backgroundColor='#fdf0f0'" onmouseout="this.style.backgroundColor='#fff'">
                            <span class="material-symbols-outlined fs-6">delete</span>
                        </button>
                    </div>
                </td>
            `;
      tableBody.appendChild(tr);
    });
  }
  const totalEl = document.getElementById("stat-total");
  const pendingEl = document.getElementById("stat-pending");
  const cookingEl = document.getElementById("stat-cooking");
  const completedEl = document.getElementById("stat-completed");
  if (totalEl) totalEl.textContent = ordersData.length;
  if (pendingEl) pendingEl.textContent = ordersData.filter((o) => o.status === "Ch\u1EDD x\xE1c nh\u1EADn").length;
  if (cookingEl) cookingEl.textContent = ordersData.filter((o) => o.status === "\u0110ang ch\u1EBF bi\u1EBFn").length;
  if (completedEl) completedEl.textContent = ordersData.filter((o) => o.status === "Ho\xE0n th\xE0nh").length;
  document.querySelectorAll(".delete-order-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      orderToDeleteId = e.currentTarget.getAttribute("data-id");
      const confirmModal = new bootstrap.Modal(document.getElementById("deleteConfirmModal"));
      confirmModal.show();
    });
  });
  document.querySelectorAll(".update-status-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      orderToUpdateId = e.currentTarget.getAttribute("data-id");
      const order = ordersData.find((o) => o.id === orderToUpdateId);
      if (order) {
        document.getElementById("updateStatusSelect").value = order.status;
        const modal = new bootstrap.Modal(document.getElementById("updateStatusModal"));
        modal.show();
      }
    });
  });
  document.querySelectorAll(".payment-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = e.currentTarget.getAttribute("data-id");
      const order = ordersData.find((o) => o.id === id);
      if (!order) return;
      document.getElementById("paymentModalOrderId").textContent = order.id;
      document.getElementById("paymentModalCustomer").textContent = order.customerSubtext || (order.customerIcon === "local_mall" ? "Kh\xE1ch l\u1EBB" : "Kh\xE1ch v\xE3ng lai");
      document.getElementById("paymentModalTable").textContent = order.customerIcon === "table_restaurant" ? order.customer : "N/A";
      document.getElementById("paymentModalTime").textContent = `${order.time} - ${order.date}`;
      const tbody = document.getElementById("paymentModalItems");
      let itemsHtml = "";
      const items = order.items || [{ name: "M\xF3n \u0103n/Th\u1EE9c u\u1ED1ng", quantity: order.itemsCount || 1, price: order.total / (order.itemsCount || 1) }];
      items.forEach((item) => {
        itemsHtml += `
                    <div class="d-flex justify-content-between mb-2 pb-2 border-bottom border-light">
                        <div>
                            <p class="mb-0 text-dark fw-medium" style="font-size: 0.9rem;">${item.name}</p>
                            <small class="text-muted">${item.quantity} x ${new Intl.NumberFormat("vi-VN").format(item.price)} \u20AB</small>
                        </div>
                        <div class="text-end fw-semibold text-dark" style="font-size: 0.9rem;">
                            ${new Intl.NumberFormat("vi-VN").format(item.quantity * item.price)} \u20AB
                        </div>
                    </div>
                `;
      });
      tbody.innerHTML = itemsHtml;
      const totalStr = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(order.total);
      document.getElementById("paymentModalTotal").textContent = totalStr;
      const savedBankConfigStr = localStorage.getItem("bankConfig");
      let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`PAY:${order.id}|TOTAL:${order.total}`)}`;
      if (savedBankConfigStr) {
        try {
          const savedBankConfig = JSON.parse(savedBankConfigStr);
          if (savedBankConfig.bankId && savedBankConfig.accountNo) {
            qrUrl = `https://img.vietqr.io/image/${savedBankConfig.bankId}-${savedBankConfig.accountNo}-compact2.png?amount=${order.total}&addInfo=${encodeURIComponent(order.id)}&accountName=${encodeURIComponent(savedBankConfig.accountName)}`;
          }
        } catch (e2) {
        }
      }
      document.getElementById("paymentModalQr").src = qrUrl;
      const printContainer = document.getElementById("printableInvoice");
      if (printContainer) {
        let printHtml = `
                    <div style="width: 80mm; margin: 0 auto; color: #000; font-family: 'Inter', sans-serif;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">Nh\xE0 H\xE0ng C\u1EE7a B\u1EA1n</h2>
                            <p style="margin: 5px 0; font-size: 12px; color: #333;">\u0110/C: S\u1ED1 1, \u0110\u01B0\u1EDDng L\xEA Du\u1EA9n, Qu\u1EADn 1, TP.HCM</p>
                            <p style="margin: 0; font-size: 12px; color: #333;">S\u0110T: 0123 456 789</p>
                            <h3 style="margin: 15px 0 10px; font-size: 18px;">PHI\u1EBEU THANH TO\xC1N</h3>
                        </div>
                        
                        <div style="font-size: 13px; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 2px 0;"><strong>M\xE3 \u0111\u01A1n:</strong> ${order.id}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><strong>Ng\xE0y gi\u1EDD:</strong> ${order.date} ${order.time}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><strong>Kh\xE1ch h\xE0ng:</strong> ${order.customerSubtext || (order.customerIcon === "local_mall" ? "Kh\xE1ch l\u1EBB" : "Kh\xE1ch v\xE3ng lai")}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 2px 0;"><strong>B\xE0n:</strong> ${order.customerIcon === "table_restaurant" ? order.customer : "N/A"}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #000;">
                                        <th style="padding: 5px 0; text-align: left;">M\xF3n</th>
                                        <th style="padding: 5px 0; text-align: center; width: 40px;">SL</th>
                                        <th style="padding: 5px 0; text-align: right; width: 80px;">T.Ti\u1EC1n</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
        items.forEach((item) => {
          printHtml += `
                                    <tr>
                                        <td style="padding: 5px 0;">${item.name}<br><small style="color:#555;">${new Intl.NumberFormat("vi-VN").format(item.price)}</small></td>
                                        <td style="padding: 5px 0; text-align: center;">${item.quantity}</td>
                                        <td style="padding: 5px 0; text-align: right;">${new Intl.NumberFormat("vi-VN").format(item.quantity * item.price)}</td>
                                    </tr>
                    `;
        });
        printHtml += `
                                </tbody>
                            </table>
                        </div>

                        <div style="font-size: 16px; font-weight: bold; text-align: right; margin-bottom: 20px;">
                            T\u1ED5ng ti\u1EC1n: ${totalStr}
                        </div>
                        
                        <div style="text-align: center; margin-bottom: 20px;">
                            <p style="margin: 0 0 10px; font-size: 13px;">M\xE3 QR Thanh to\xE1n:</p>
                            <img src="${qrUrl}" alt="QR code" style="width: 150px; height: 150px;" />
                        </div>
                        
                        <div style="text-align: center; font-size: 13px;">
                            <p style="margin: 5px 0;">C\u1EA3m \u01A1n v\xE0 h\u1EB9n g\u1EB7p l\u1EA1i qu\xFD kh\xE1ch!</p>
                            <p style="margin: 5px 0;">***</p>
                        </div>
                    </div>
                `;
        printContainer.innerHTML = printHtml;
      }
      const modal = new bootstrap.Modal(document.getElementById("paymentModal"));
      modal.show();
    });
  });
}
function showToast(message, type = "success") {
  const toastEl = document.getElementById("liveToast");
  if (toastEl) {
    const toastMessage = document.getElementById("toastMessage");
    toastMessage.textContent = message;
    if (type === "success") {
      toastEl.className = "toast align-items-center text-white bg-success border-0";
      toastEl.querySelector(".material-symbols-outlined").textContent = "check_circle";
    } else if (type === "danger") {
      toastEl.className = "toast align-items-center text-white bg-danger border-0";
      toastEl.querySelector(".material-symbols-outlined").textContent = "error";
    }
    const toast = new bootstrap.Toast(toastEl, { delay: 3e3 });
    toast.show();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  renderOrders();
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderOrders();
    });
  }
  const statusFilterHtml = document.getElementById("statusFilter");
  if (statusFilterHtml) {
    statusFilterHtml.addEventListener("change", (e) => {
      currentFilter = e.target.value;
      renderOrders();
    });
  }
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", () => {
      if (orderToDeleteId) {
        ordersData = ordersData.filter((o) => o.id !== orderToDeleteId);
        orderToDeleteId = null;
        const modalEl = document.getElementById("deleteConfirmModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        showToast("\u0110\xE3 x\xF3a \u0111\u01A1n h\xE0ng th\xE0nh c\xF4ng!", "success");
        renderOrders();
      }
    });
  }
  const addOrderForm = document.getElementById("addOrderForm");
  if (addOrderForm) {
    addOrderForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const customer = document.getElementById("newOrderCustomer").value;
      const totalStr = document.getElementById("newOrderTotal").value;
      const status = document.getElementById("newOrderStatus").value;
      const newId = `ORD-${Math.floor(Math.random() * 9e3) + 1e3}`;
      const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      const date = (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN");
      const newOrder = {
        id: newId,
        time,
        date,
        customer,
        customerIcon: customer.toLowerCase().includes("b\xE0n") ? "table_restaurant" : "local_mall",
        customerSubtext: "",
        itemsCount: 1,
        // Default to 1 for generic creation
        total: parseInt(totalStr, 10) || 0,
        status,
        statusClass: getStatusClass(status)
      };
      ordersData.unshift(newOrder);
      const modalEl = document.getElementById("addOrderModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      addOrderForm.reset();
      showToast("T\u1EA1o \u0111\u01A1n h\xE0ng m\u1EDBi th\xE0nh c\xF4ng!", "success");
      renderOrders();
    });
  }
  const updateStatusForm = document.getElementById("updateStatusForm");
  if (updateStatusForm) {
    updateStatusForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (orderToUpdateId) {
        const newStatus = document.getElementById("updateStatusSelect").value;
        const order = ordersData.find((o) => o.id === orderToUpdateId);
        if (order) {
          order.status = newStatus;
          order.statusClass = getStatusClass(newStatus);
        }
        orderToUpdateId = null;
        const modalEl = document.getElementById("updateStatusModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        showToast("C\u1EADp nh\u1EADt tr\u1EA1ng th\xE1i th\xE0nh c\xF4ng!", "success");
        renderOrders();
      }
    });
  }
});
