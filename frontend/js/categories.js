document.addEventListener('DOMContentLoaded', () => {
    const FV = window.FormValidation;
    const API_BASE_URL = 'http://localhost:7071/api';
    const CATEGORIES_API_URL = `${API_BASE_URL}/Categories`;
    const ITEMS_PER_PAGE = 10;
    const elements = {
        tableBody: document.getElementById('categoriesTableBody'),
        categoryForm: document.getElementById('categoryForm'),
        categoryId: document.getElementById('categoryId'),
        categoryName: document.getElementById('categoryName'),
        categoryDesc: document.getElementById('categoryDesc'),
        modalLabel: document.getElementById('addCategoryModalLabel'),
        confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
        searchInput: document.getElementById('categorySearch')
    };
    const state = {
        categories: [],
        currentPage: 1,
        totalPages: 1,
        searchTerm: '',
        categoryToDeleteId: null
    };
    async function request(url, options = {}) {
        const resp = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        if (!resp.ok) {
            let msg = `API lỗi (${resp.status})`;
            try { const b = await resp.text(); if (b) msg = b; } catch (_) {}
            throw new Error(msg);
        }
        if (resp.status === 204) return null;
        return resp.json();
    }
    function showToast(message, type = 'success') {
        const toast = document.getElementById('liveToast');
        const msg = document.getElementById('toastMessage');
        if (!toast || !msg) { alert(message); return; }
        msg.textContent = message;
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        new bootstrap.Toast(toast, { delay: 3000 }).show();
    }
    async function loadCategories() {
        if (!elements.tableBody) return;
        elements.tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span></td></tr>';
        try {
            const query = new URLSearchParams({
                page: state.currentPage,
                pageSize: ITEMS_PER_PAGE,
                searchTerm: state.searchTerm,
                sortBy: 'name',
                sortOrder: 'asc'
            });
            const resp = await request(`${CATEGORIES_API_URL}?${query}`);
            state.categories = resp?.items || [];
            state.totalPages = Math.ceil((resp?.totalItemCount || state.categories.length) / ITEMS_PER_PAGE) || 1;
        } catch (err) {
            console.warn('Không thể tải danh mục từ API:', err.message);
            state.categories = JSON.parse(localStorage.getItem('bistro_categories') || '[]');
            state.totalPages = Math.ceil(state.categories.length / ITEMS_PER_PAGE) || 1;
        }
        renderCategories();
    }
    function renderCategories() {
        if (!elements.tableBody) return;
        const filtered = state.categories.filter(c => {
            if (!state.searchTerm) return true;
            const s = state.searchTerm.toLowerCase();
            return (c.name || '').toLowerCase().includes(s) || (c.description || '').toLowerCase().includes(s);
        });
        const start = (state.currentPage - 1) * ITEMS_PER_PAGE;
        const pageData = filtered.slice(start, start + ITEMS_PER_PAGE);
        if (pageData.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Không tìm thấy danh mục nào.</td></tr>';
            return;
        }
        elements.tableBody.innerHTML = pageData.map(c => `
            <tr>
                <td class="ps-4 fw-semibold">${c.name || '-'}</td>
                <td class="text-muted">${c.description || '-'}</td>
                <td><span class="badge bg-success bg-opacity-10 text-success">Hoạt động</span></td>
                <td class="small text-muted">${c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center edit-btn" data-id="${c.id}" title="Sửa" style="width:32px;height:32px;border-radius:50%;color:var(--text-soft) !important;background-color:#fff !important;">
                            <span class="material-symbols-outlined icon-sm">edit</span>
                        </button>
                        <button class="btn btn-light btn-icon shadow-sm p-0 d-flex align-items-center justify-content-center delete-btn" data-id="${c.id}" title="Xóa" style="width:32px;height:32px;border-radius:50%;color:#dc3545 !important;background-color:#fff !important;">
                            <span class="material-symbols-outlined icon-sm">delete</span>
                        </button>
                    </div>
                </td>
            </tr>`).join('');
        bindRowButtons();
    }
    function bindRowButtons() {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const c = state.categories.find(x => String(x.id) === String(btn.dataset.id));
                if (!c) return;
                elements.modalLabel.textContent = 'Sửa danh mục';
                elements.categoryId.value = c.id;
                elements.categoryName.value = c.name || '';
                elements.categoryDesc.value = c.description || '';
                new bootstrap.Modal(document.getElementById('addCategoryModal')).show();
            });
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.categoryToDeleteId = btn.dataset.id;
                new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
            });
        });
    }
    function bindEvents() {
        elements.searchInput?.addEventListener('input', () => {
            state.searchTerm = elements.searchInput.value.trim().toLowerCase();
            state.currentPage = 1;
            renderCategories();
        });
        elements.categoryForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = elements.categoryId.value;
            const name = FV?.normalizeWhitespace(elements.categoryName.value) || elements.categoryName.value.trim();
            const description = FV?.normalizeWhitespace(elements.categoryDesc.value) || elements.categoryDesc.value.trim();
            let isValid = true;
            FV?.clearFormErrors(elements.categoryForm);
            if (!name) {
                isValid = FV ? FV.setFieldError(elements.categoryName, 'Vui lòng nhập tên danh mục.') : false;
            } else if (name.length < 2 || name.length > 60) {
                isValid = FV ? FV.setFieldError(elements.categoryName, 'Tên danh mục phải từ 2 đến 60 ký tự.') : false;
            } else {
                elements.categoryName.value = name;
                FV?.markFieldValid(elements.categoryName);
            }
            if (description && description.length > 200) {
                isValid = FV ? FV.setFieldError(elements.categoryDesc, 'Mô tả tối đa 200 ký tự.') : false;
            } else if (description) {
                elements.categoryDesc.value = description;
                FV?.markFieldValid(elements.categoryDesc);
            } else {
                FV?.clearFieldError(elements.categoryDesc);
            }
            if (!isValid) return;
            const payload = {
                name,
                description
            };
            try {
                if (id) {
                    await request(`${CATEGORIES_API_URL}/${encodeURIComponent(id)}`, {
                        method: 'PUT', body: JSON.stringify({ id: Number(id), ...payload })
                    });
                } else {
                    await request(CATEGORIES_API_URL, { method: 'POST', body: JSON.stringify(payload) });
                }
                showToast(id ? 'Đã cập nhật danh mục!' : 'Đã thêm danh mục!');
            } catch (err) { showToast(err.message, 'danger'); }
            bootstrap.Modal.getInstance(document.getElementById('addCategoryModal'))?.hide();
            elements.categoryForm.reset();
            elements.categoryId.value = '';
            await loadCategories();
        });
        elements.confirmDeleteBtn?.addEventListener('click', async () => {
            if (!state.categoryToDeleteId) return;
            try { await request(`${CATEGORIES_API_URL}/${encodeURIComponent(state.categoryToDeleteId)}`, { method: 'DELETE' }); } catch (_) {}
            state.categories = state.categories.filter(c => String(c.id) !== String(state.categoryToDeleteId));
            state.categoryToDeleteId = null;
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
            renderCategories();
            showToast('Đã xóa danh mục!');
        });
        document.getElementById('btnOpenAddModal')?.addEventListener('click', () => {
            elements.modalLabel.textContent = 'Thêm danh mục';
            elements.categoryForm.reset();
            elements.categoryId.value = '';
        });
    }
    FV?.enableInstantClear(elements.categoryForm);
    bindEvents();
    loadCategories();
});
