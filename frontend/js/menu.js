import { PRODUCT_STATUSES, isOutOfStockProductStatus } from './status-constants.js';

document.addEventListener('DOMContentLoaded', () => {
    const FV = window.FormValidation;
    const API_BASE_URL = 'http://localhost:7071/api';
    const PRODUCTS_API_URL = `${API_BASE_URL}/Products`;
    const CATEGORIES_API_URL = `${API_BASE_URL}/Categories`;
    const ALL_OPTION = 'Tất cả';
    const DEFAULT_SORT = 'name-asc';
    const ITEMS_PER_PAGE = 10;
    const STORAGE_KEYS = {
        products: 'bistro_products',
        categories: 'bistro_categories'
    };
    const STATUS_OPTIONS = [
        { value: ALL_OPTION, label: 'Tất cả trạng thái' },
        { value: 'active', label: PRODUCT_STATUSES.SELLING },
        { value: 'outofstock', label: PRODUCT_STATUSES.OUT_OF_STOCK },
        { value: 'inactive', label: PRODUCT_STATUSES.DISCONTINUED }
    ];
    const FORM_STATUS_OPTIONS = [
        { value: PRODUCT_STATUSES.SELLING, label: PRODUCT_STATUSES.SELLING },
        { value: PRODUCT_STATUSES.OUT_OF_STOCK, label: PRODUCT_STATUSES.OUT_OF_STOCK },
        { value: PRODUCT_STATUSES.DISCONTINUED, label: PRODUCT_STATUSES.DISCONTINUED }
    ];
    const SORT_OPTIONS = [
        { value: 'name-asc', label: 'Tên (A-Z)' },
        { value: 'name-desc', label: 'Tên (Z-A)' },
        { value: 'price-asc', label: 'Giá (Tăng dần)' },
        { value: 'price-desc', label: 'Giá (Giảm dần)' }
    ];
    const EMPTY_PAGED_RESPONSE = {
        items: [],
        pageNumber: 1,
        pageSize: ITEMS_PER_PAGE,
        totalItemCount: 0,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false
    };

    const elements = {
        actionButtons: document.getElementById('menuActionButtons'),
        tableBody: document.getElementById('menuTableBody'),
        searchInput: document.getElementById('menuSearch'),
        categoryFilter: document.getElementById('categoryFilter'),
        statusFilter: document.getElementById('statusFilter'),
        sortFilter: document.getElementById('sortOption'),
        pagination: document.getElementById('menuPagination'),
        tableInfo: document.getElementById('menuTableInfo'),
        addFoodModal: document.getElementById('addFoodModal'),
        addFoodForm: document.getElementById('addFoodForm'),
        saveFoodButton: document.getElementById('saveFoodBtn'),
        deleteConfirmButton: document.getElementById('confirmDeleteBtn'),
        actionToast: document.getElementById('actionToast'),
        toastMessage: document.getElementById('toastMessage'),
        modalTitle: document.getElementById('addFoodModalLabel'),
        foodName: document.getElementById('foodName'),
        foodImage: document.getElementById('foodImage'),
        foodPrice: document.getElementById('foodPrice'),
        foodCategory: document.getElementById('foodCategory'),
        foodStatus: document.getElementById('foodStatus'),
        foodDesc: document.getElementById('foodDesc'),
        addFoodTriggerButton: document.getElementById('addFoodTriggerBtn')
    };

    function getCurrentUserRole() {
        if (window.Auth?.getRole) {
            return window.Auth.getRole();
        }

        const user = window.Auth?.getUser?.();
        const rawRole = String(user?.role || (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) || 'Staff')
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/^ROLE_/, '')
            .replace(/[^A-Z0-9]/g, '');

        if (rawRole === 'STAFF' || rawRole === 'EMPLOYEE' || rawRole === 'NHANVIEN' || rawRole === 'NHAN_VIEN') {
            return 'Staff';
        }

        return rawRole.charAt(0) + rawRole.slice(1).toLowerCase();
    }

    const isStaffRole = getCurrentUserRole() === 'Staff';

    const state = {
        sourceProducts: [],
        products: [],
        categories: [],
        pagination: { ...EMPTY_PAGED_RESPONSE },
        currentPage: 1,
        editingProductId: null,
        deletingProductId: null
    };

    function readJson(key, fallback) {
        return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function showToast(message, type = 'success') {
        if (!elements.actionToast || !elements.toastMessage) return;

        elements.toastMessage.textContent = message;
        elements.actionToast.classList.remove('bg-success', 'bg-danger', 'bg-info', 'text-white');

        if (type === 'danger') {
            elements.actionToast.classList.add('bg-danger');
        } else if (type === 'info') {
            elements.actionToast.classList.add('bg-info', 'text-white');
        } else {
            elements.actionToast.classList.add('bg-success');
        }

        new bootstrap.Toast(elements.actionToast).show();
    }

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
            } catch (_) {

            }

            throw new Error(message);
        }

        if (response.status === 204) return null;
        return response.json();
    }

    function renderSelectOptions(selectElement, options, selectedValue) {
        if (!selectElement) return;

        selectElement.innerHTML = options
            .map(option => `<option value="${option.value}">${option.label}</option>`)
            .join('');

        if (selectedValue && options.some(option => option.value === selectedValue)) {
            selectElement.value = selectedValue;
        }
    }

    function getSelectedCategoryId() {
        const value = elements.categoryFilter?.value || ALL_OPTION;
        return value === ALL_OPTION ? null : Number(value);
    }

    function getSelectedStatus() {
        return elements.statusFilter?.value || ALL_OPTION;
    }

    function getSelectedSort() {
        return elements.sortFilter?.value || DEFAULT_SORT;
    }

    function getSearchTerm() {
        return elements.searchInput?.value.trim() || '';
    }

    function mapSortOption(sortValue) {
        if (sortValue === 'name-desc') return { sortBy: 'name', sortOrder: 'desc' };
        if (sortValue === 'price-asc') return { sortBy: 'price', sortOrder: 'asc' };
        if (sortValue === 'price-desc') return { sortBy: 'price', sortOrder: 'desc' };
        return { sortBy: 'name', sortOrder: 'asc' };
    }

    function mapProductStatus(statusValue) {
        if (statusValue === 'outofstock') return PRODUCT_STATUSES.OUT_OF_STOCK;
        if (statusValue === 'inactive') return PRODUCT_STATUSES.DISCONTINUED;
        return PRODUCT_STATUSES.ACTIVE;
    }

    function mapProductStatusForApi(statusValue) {
        if (statusValue === PRODUCT_STATUSES.SELLING) return PRODUCT_STATUSES.ACTIVE;
        if (statusValue === PRODUCT_STATUSES.OUT_OF_STOCK) return PRODUCT_STATUSES.OUT_OF_STOCK;
        if (statusValue === PRODUCT_STATUSES.DISCONTINUED) return PRODUCT_STATUSES.DISCONTINUED;
        return PRODUCT_STATUSES.ACTIVE;
    }

    function getCategoryName(categoryId) {
        return state.categories.find(category => category.id === categoryId)?.name || 'Khác';
    }

    function getProductStatusLabel(product) {
        if (isOutOfStockProductStatus(product.status)) return PRODUCT_STATUSES.OUT_OF_STOCK;
        if (String(product.status || '').toLowerCase() === 'ngừng bán' || String(product.status || '').toLowerCase() === 'inactive') {
            return PRODUCT_STATUSES.DISCONTINUED;
        }
        return PRODUCT_STATUSES.SELLING;
    }

    function getProductStatusBadgeClass(statusLabel) {
        if (statusLabel === PRODUCT_STATUSES.OUT_OF_STOCK) {
            return 'bg-danger bg-opacity-10 text-danger border-danger';
        }

        if (statusLabel === PRODUCT_STATUSES.DISCONTINUED) {
            return 'bg-warning bg-opacity-10 text-warning border-warning';
        }

        return 'bg-success bg-opacity-10 text-success border-success';
    }

    function getCategoryOptions() {
        return [
            { value: ALL_OPTION, label: 'Tất cả danh mục' },
            ...state.categories.map(category => ({
                value: String(category.id),
                label: category.name
            }))
        ];
    }

    function updateFilters() {
        renderSelectOptions(elements.categoryFilter, getCategoryOptions(), elements.categoryFilter?.value || ALL_OPTION);
        renderSelectOptions(elements.statusFilter, STATUS_OPTIONS, getSelectedStatus());
        renderSelectOptions(elements.sortFilter, SORT_OPTIONS, getSelectedSort());
        renderSelectOptions(elements.foodCategory, state.categories.map(category => ({
            value: String(category.id),
            label: category.name
        })), elements.foodCategory?.value);
        renderSelectOptions(elements.foodStatus, FORM_STATUS_OPTIONS, elements.foodStatus?.value || PRODUCT_STATUSES.SELLING);
    }

    function updateStats() {
        const statElements = document.querySelectorAll('.stat-card h2');
        if (statElements.length < 4) return;

        const sellingCount = state.products.filter(product => getProductStatusLabel(product) === PRODUCT_STATUSES.SELLING).length;
        const outOfStockCount = state.products.filter(product => getProductStatusLabel(product) === PRODUCT_STATUSES.OUT_OF_STOCK).length;
        const inactiveCount = state.products.filter(product => getProductStatusLabel(product) === PRODUCT_STATUSES.DISCONTINUED).length;

        statElements[0].textContent = state.pagination.totalItemCount;
        statElements[1].textContent = sellingCount;
        statElements[2].textContent = outOfStockCount;
        statElements[3].textContent = inactiveCount;
    }

    function renderPagination() {
        if (!elements.pagination) return;

        const totalPages = Math.max(1, state.pagination.pageCount || 1);
        let markup = `
            <li class="page-item ${state.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link border text-secondary bg-white px-3" style="border-radius:0;" href="#" data-page="prev">Trước</a>
            </li>
        `;

        markup += `
            <li class="page-item ${state.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link border text-secondary bg-white px-3" style="border-radius:0;" href="#" data-page="next">Sau</a>
            </li>
        `;

        elements.pagination.innerHTML = markup;
    }

    function getProductImageMarkup(product, categoryName) {
        if (product.imageUrl) {
            return `<img src="${product.imageUrl}" class="w-100 h-100 rounded" style="object-fit: cover;">`;
        }

        let iconName = 'restaurant';
        if (categoryName === 'Đồ uống') iconName = 'local_bar';
        if (categoryName === 'Tráng miệng') iconName = 'icecream';
        if (categoryName === 'Khai vị') iconName = 'tapas';

        return `<span class="material-symbols-outlined">${iconName}</span>`;
    }

    function renderProducts() {
        if (!elements.tableBody) return;

        if (state.products.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Không tìm thấy dữ liệu</td></tr>';
            renderPagination();
            updateStats();
            return;
        }

        elements.tableBody.innerHTML = state.products.map(product => {
            const categoryName = getCategoryName(product.categoryId);
            const statusLabel = getProductStatusLabel(product);
            const badgeClass = getProductStatusBadgeClass(statusLabel);
            const imageMarkup = getProductImageMarkup(product, categoryName);

            return `
                <tr data-id="${product.id}">
                    <td class="ps-4">
                        <div class="d-flex align-items-center gap-3">
                            <div class="menu-img ${!product.imageUrl ? 'd-flex align-items-center justify-content-center text-muted border' : ''} rounded" style="width: 48px; height: 48px; min-width: 48px; overflow:hidden;">
                                ${imageMarkup}
                            </div>
                            <div>
                                <h6 class="mb-0 fw-semibold text-dark">${product.name || ''}</h6>
                                <small class="text-muted d-block text-truncate" style="max-width: 200px;">${product.description || ''}</small>
                            </div>
                        </div>
                    </td>
                    <td>${categoryName}</td>
                    <td class="fw-bold text-dark">${Math.trunc(product.price || 0).toLocaleString('vi-VN')} ₫</td>
                    <td><span class="badge ${badgeClass} border px-2 py-1 rounded-pill">${statusLabel}</span></td>
                    <td class="text-end pe-4">
                        <div class="d-flex justify-content-end gap-2">
                            ${isStaffRole ? '' : `
                            <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center edit-product-btn" style="width: 32px; height: 32px; border-radius: 50%; color: var(--text-soft) !important; background-color: #fff !important;" title="Sửa">
                                <span class="material-symbols-outlined fs-6">edit</span>
                            </button>
                            <button class="btn btn-light btn-icon border border-danger shadow-sm p-0 d-flex align-items-center justify-content-center delete-product-btn" style="width: 32px; height: 32px; border-radius: 50%; color: #dc3545 !important; background-color: #fff !important;" title="Xóa">
                                <span class="material-symbols-outlined fs-6">delete</span>
                            </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');


        renderPagination();
        updateStats();
    }

    function applyClientFilters() {
        const selectedCategoryId = getSelectedCategoryId();
        const selectedStatus = getSelectedStatus();
        let filteredProducts = [...state.sourceProducts];

        if (selectedCategoryId) {
            filteredProducts = filteredProducts.filter(product => product.categoryId === selectedCategoryId);
        }

        if (selectedStatus !== ALL_OPTION) {
            filteredProducts = filteredProducts.filter(product => {
                const productStatus = getProductStatusLabel(product);

                if (selectedStatus === 'active') return productStatus === PRODUCT_STATUSES.SELLING;
                if (selectedStatus === 'outofstock') return productStatus === PRODUCT_STATUSES.OUT_OF_STOCK;
                if (selectedStatus === 'inactive') return productStatus === PRODUCT_STATUSES.DISCONTINUED;

                return true;
            });
        }

        const totalItemCount = filteredProducts.length;
        const pageCount = Math.max(1, Math.ceil(totalItemCount / ITEMS_PER_PAGE));

        if (state.currentPage > pageCount) {
            state.currentPage = pageCount;
        }

        const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
        state.products = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        state.pagination = {
            items: state.products,
            pageNumber: state.currentPage,
            pageSize: ITEMS_PER_PAGE,
            totalItemCount,
            pageCount,
            hasPreviousPage: state.currentPage > 1,
            hasNextPage: state.currentPage < pageCount
        };
    }

    function buildProductsQueryString() {
        const { sortBy, sortOrder } = mapSortOption(getSelectedSort());
        const params = new URLSearchParams({
            page: '1',
            pageSize: '100',
            sortBy,
            sortOrder
        });
        const searchTerm = getSearchTerm();

        if (searchTerm) params.set('searchTerm', searchTerm);

        return params.toString();
    }

    async function loadCategories() {
        const response = await request(`${CATEGORIES_API_URL}?page=1&pageSize=100&sortBy=name&sortOrder=asc`);
        state.categories = Array.isArray(response?.items) ? response.items : [];
        writeJson(STORAGE_KEYS.categories, state.categories);
        updateFilters();
    }

    async function loadProducts() {
        const response = await request(`${PRODUCTS_API_URL}?${buildProductsQueryString()}`);
        state.sourceProducts = Array.isArray(response?.items) ? response.items : [];
        applyClientFilters();
        writeJson(STORAGE_KEYS.products, state.sourceProducts);
        renderProducts();
    }

    async function loadData() {
        try {
            await loadCategories();
            await loadProducts();
        } catch (error) {
            console.error('Không tải được dữ liệu thực đơn:', error);
            showToast(`Không tải được dữ liệu thực đơn: ${error.message}`, 'danger');
            state.categories = readJson(STORAGE_KEYS.categories, []);
            state.sourceProducts = [];
            state.products = [];
            state.pagination = { ...EMPTY_PAGED_RESPONSE };
            updateFilters();
            renderProducts();
        }
    }

    function resetFoodForm() {
        elements.addFoodForm?.reset();
        state.editingProductId = null;

        if (elements.modalTitle) elements.modalTitle.textContent = 'Thêm món mới';
        if (elements.saveFoodButton) elements.saveFoodButton.textContent = 'Lưu món';
    }

    function findProductById(productId) {
        return state.products.find(product => String(product.id) === String(productId));
    }

    function fillFoodForm(product) {
        if (!product) {
            resetFoodForm();
            generateSku();
            return;
        }

        elements.foodName.value = product.name || '';
        elements.foodDesc.value = product.description || '';
        elements.foodCategory.value = String(product.categoryId || '');
        elements.foodPrice.value = Math.trunc(product.price || 0);
        elements.foodStatus.value = getProductStatusLabel(product);

        if (elements.modalTitle) elements.modalTitle.textContent = 'Sửa món ăn';
        if (elements.saveFoodButton) elements.saveFoodButton.textContent = 'Cập nhật';
    }

    function createProductPayload() {
        const categoryId = Number(elements.foodCategory.value);
        const statusLabel = elements.foodStatus.value;
        const editingProduct = state.editingProductId ? findProductById(state.editingProductId) : null;
        const payload = {
            name: elements.foodName.value.trim(),
            categoryId,
            price: Number(elements.foodPrice.value),
            imageUrl: editingProduct?.imageUrl || null,
            description: elements.foodDesc.value.trim() || null,
            status: mapProductStatusForApi(statusLabel),
            createdAt: editingProduct?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (state.editingProductId) {
            payload.id = state.editingProductId;
        }

        return payload;
    }

    async function createProduct(payload) {
        await request(PRODUCTS_API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async function updateProduct(productId, payload) {
        await request(`${PRODUCTS_API_URL}/${encodeURIComponent(productId)}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    }

    async function deleteProduct(productId) {
        await request(`${PRODUCTS_API_URL}/${encodeURIComponent(productId)}`, {
            method: 'DELETE'
        });
    }

    function openFoodModalForEdit(productId) {
        if (isStaffRole) return;
        const product = findProductById(productId);
        if (!product) return;

        state.editingProductId = product.id;
        fillFoodForm(product);

        const modal = bootstrap.Modal.getInstance(elements.addFoodModal) || new bootstrap.Modal(elements.addFoodModal);
        modal.show();
    }

    async function handleSaveFood() {
        if (isStaffRole) {
            showToast('Nhân viên không có quyền thêm hoặc sửa món ăn.', 'info');
            return;
        }
        const payload = createProductPayload();
        let isValid = true;

        FV?.clearFormErrors(elements.addFoodForm);

        if (!payload.name) {
            isValid = FV ? FV.setFieldError(elements.foodName, 'Vui lòng nhập tên món ăn.') : false;
        } else if (payload.name.length < 2 || payload.name.length > 100) {
            isValid = FV ? FV.setFieldError(elements.foodName, 'Tên món phải từ 2 đến 100 ký tự.') : false;
        } else {
            FV?.markFieldValid(elements.foodName);
        }

        if (!elements.foodPrice.value) {
            isValid = FV ? FV.setFieldError(elements.foodPrice, 'Vui lòng nhập giá món ăn.') : false;
        } else if (!Number.isFinite(payload.price) || payload.price <= 0) {
            isValid = FV ? FV.setFieldError(elements.foodPrice, 'Giá món phải lớn hơn 0.') : false;
        } else {
            FV?.markFieldValid(elements.foodPrice);
        }

        if (!payload.categoryId) {
            isValid = FV ? FV.setFieldError(elements.foodCategory, 'Vui lòng chọn danh mục.') : false;
        } else {
            FV?.markFieldValid(elements.foodCategory);
        }

        if (!elements.foodStatus.value) {
            isValid = FV ? FV.setFieldError(elements.foodStatus, 'Vui lòng chọn trạng thái.') : false;
        } else {
            FV?.markFieldValid(elements.foodStatus);
        }

        if (payload.description && payload.description.length > 300) {
            isValid = FV ? FV.setFieldError(elements.foodDesc, 'Mô tả tối đa 300 ký tự.') : false;
        } else if (payload.description) {
            FV?.markFieldValid(elements.foodDesc);
        } else {
            FV?.clearFieldError(elements.foodDesc);
        }

        if (!isValid) {
            return;
        }

        try {
            if (state.editingProductId) {
                await updateProduct(state.editingProductId, payload);
                showToast(`Đã cập nhật món: ${payload.name}`);
            } else {
                await createProduct(payload);
                showToast(`Đã thêm món mới: ${payload.name}`);
            }

            bootstrap.Modal.getInstance(elements.addFoodModal)?.hide();
            await loadProducts();
            resetFoodForm();
        } catch (error) {
            console.error('Không lưu được món ăn:', error);
            showToast(`Không thể lưu món ăn: ${error.message}`, 'danger');
        }
    }

    async function handleDeleteConfirm() {
        if (isStaffRole) {
            state.deletingProductId = null;
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
            showToast('Nhân viên không có quyền xóa món ăn.', 'info');
            return;
        }
        if (!state.deletingProductId) return;

        try {
            await deleteProduct(state.deletingProductId);
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
            showToast('Đã xóa món thành công!');
            state.deletingProductId = null;
            await loadProducts();
        } catch (error) {
            console.error('Không xóa được món ăn:', error);
            showToast(`Không thể xóa món ăn: ${error.message}`, 'danger');
        }
    }

    function handleFilterChange() {
        state.currentPage = 1;
        loadProducts();
    }

    function handlePaginationClick(event) {
        const link = event.target.closest('[data-page]');
        if (!link) return;

        event.preventDefault();

        if (link.dataset.page === 'prev' && state.currentPage > 1) {
            state.currentPage -= 1;
        } else if (link.dataset.page === 'next' && state.currentPage < Math.max(1, state.pagination.pageCount || 1)) {
            state.currentPage += 1;
        }

        applyClientFilters();
        renderProducts();
    }

    function handleTableAction(event) {
        if (isStaffRole) return;
        const editButton = event.target.closest('.edit-product-btn');
        const deleteButton = event.target.closest('.delete-product-btn');
        const row = event.target.closest('tr[data-id]');
        if (!row) return;

        const productId = row.dataset.id;

        if (editButton) {
            openFoodModalForEdit(productId);
            return;
        }

        if (deleteButton) {
            state.deletingProductId = productId;
            new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
        }
    }

    function bindEvents() {
        elements.searchInput?.addEventListener('input', handleFilterChange);
        elements.categoryFilter?.addEventListener('change', handleFilterChange);
        elements.statusFilter?.addEventListener('change', handleFilterChange);
        elements.sortFilter?.addEventListener('change', handleFilterChange);
        elements.pagination?.addEventListener('click', handlePaginationClick);
        elements.tableBody?.addEventListener('click', handleTableAction);
        elements.deleteConfirmButton?.addEventListener('click', handleDeleteConfirm);
        elements.saveFoodButton?.addEventListener('click', handleSaveFood);

        elements.addFoodModal?.addEventListener('hidden.bs.modal', resetFoodForm);
        elements.addFoodModal?.addEventListener('show.bs.modal', () => {
            if (isStaffRole) {
                bootstrap.Modal.getInstance(elements.addFoodModal)?.hide();
                showToast('Nhân viên không có quyền thêm món ăn.', 'info');
                return;
            }
            if (!state.editingProductId) {
                updateFilters();
            }
        });
    }

    if (elements.addFoodTriggerButton) {
        elements.addFoodTriggerButton.classList.toggle('d-none', isStaffRole);
    }

    FV?.enableInstantClear(elements.addFoodForm);
    bindEvents();
    updateFilters();
    loadData();
});
