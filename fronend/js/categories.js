document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:7071/api';
    const CATEGORIES_API_URL = `${API_BASE_URL}/Categories`;
    const ITEMS_PER_PAGE = 10;

    const tableBody = document.getElementById('categoriesTableBody');
    const categoryForm = document.getElementById('categoryForm');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const addModalEl = document.getElementById('addCategoryModal');
    
    const state = {
        currentPage: 1,
        totalPages: 1,
        searchTerm: '',
        editingId: null,
        isLoading: false
    };

    // Helper function for API requests
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
                // Ignore parse errors
            }
            throw new Error(message);
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();
    }

    // Reset modal on close
    if (addModalEl) {
        addModalEl.addEventListener('hidden.bs.modal', () => {
            categoryForm.reset();
            document.getElementById('categoryId').value = '';
            document.querySelector('#addCategoryModal .modal-title').textContent = 'Thêm danh mục mới';
            saveBtn.textContent = 'Lưu danh mục';
            state.editingId = null;
        });
    }

    function renderPagination() {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        // Prev button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${state.currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="prev">Trước</a>`;
        paginationContainer.appendChild(prevLi);
        
        // Page numbers
        for (let i = 1; i <= state.totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${state.currentPage === i ? 'active' : ''}`;
            const activeClasses = state.currentPage === i ? 'bg-primary text-white' : 'text-secondary bg-light';
            li.innerHTML = `<a class="page-link rounded-pill border-0 ${activeClasses} px-3" href="#" data-page="${i}">${i}</a>`;
            paginationContainer.appendChild(li);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${state.currentPage === state.totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="next">Sau</a>`;
        paginationContainer.appendChild(nextLi);
        
        // Add event listeners
        paginationContainer.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                if (page === 'prev' && state.currentPage > 1) {
                    state.currentPage--;
                    loadAndRenderCategories();
                } else if (page === 'next' && state.currentPage < state.totalPages) {
                    state.currentPage++;
                    loadAndRenderCategories();
                } else if (page !== 'prev' && page !== 'next') {
                    state.currentPage = parseInt(page);
                    loadAndRenderCategories();
                }
            });
        });
    }

    async function loadAndRenderCategories() {
        if (state.isLoading) return;
        
        state.isLoading = true;
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4"><span class="spinner-border spinner-border-sm"></span></td></tr>';

        try {
            const searchTerm = document.getElementById('searchCategory')?.value.trim() || '';
            const queryParams = new URLSearchParams({
                page: state.currentPage,
                pageSize: ITEMS_PER_PAGE,
                searchTerm: searchTerm,
                sortBy: 'name',
                sortOrder: 'asc'
            });

            const response = await request(`${CATEGORIES_API_URL}?${queryParams}`);
            
            if (response?.items) {
                renderTable(response.items);
                state.totalPages = response.totalPages || 1;
            } else {
                tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Không tìm thấy danh mục.</td></tr>';
            }
        } catch (error) {
            console.error('Lỗi khi tải danh mục:', error);
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-danger">Lỗi: ${error.message}</td></tr>`;
        } finally {
            state.isLoading = false;
            renderPagination();
        }
    }

    function renderTable(categories) {
        tableBody.innerHTML = '';
        
        if (!categories || categories.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Không tìm thấy danh mục.</td></tr>';
            return;
        }

        categories.forEach(cat => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4">
                    <h6 class="mb-0 fw-semibold text-dark">${escapeHtml(cat.name)}</h6>
                </td>
                <td><span class="text-secondary">${escapeHtml(cat.description || '')}</span></td>
                <td class="text-end pe-4">
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-light btn-icon border shadow-sm p-0 d-flex align-items-center justify-content-center edit-btn" data-id="${cat.id}" style="width: 32px; height: 32px; border-radius: 50%;">
                            <span class="material-symbols-outlined fs-6">edit</span>
                        </button>
                        <button class="btn btn-light btn-icon border border-danger shadow-sm p-0 d-flex align-items-center justify-content-center delete-btn" data-id="${cat.id}" style="width: 32px; height: 32px; border-radius: 50%; color: #dc3545 !important;">
                            <span class="material-symbols-outlined fs-6">delete</span>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Handle form submit/save
    saveBtn.addEventListener('click', async () => {
        const nameInput = document.getElementById('categoryName').value.trim();
        const descInput = document.getElementById('categoryDescription').value.trim();

        if (!nameInput) {
            alert('Vui lòng nhập tên danh mục.');
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';

        try {
            const payload = {
                name: nameInput,
                description: descInput || null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (state.editingId) {
                // Update
                payload.id = state.editingId;
                await request(`${CATEGORIES_API_URL}/${state.editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                // Create new
                await request(CATEGORIES_API_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            state.currentPage = 1;
            state.editingId = null;
            await loadAndRenderCategories();
            
            const modal = bootstrap.Modal.getInstance(addModalEl);
            if (modal) modal.hide();
        } catch (error) {
            console.error('Lỗi khi lưu danh mục:', error);
            alert(`Lỗi: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Lưu danh mục';
        }
    });

    // Handle Edit / Delete Actions
    let categoryToDelete = null;
    const deleteModalEl = document.getElementById('deleteCategoryModal');
    const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (categoryToDelete !== null) {
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xóa...';

                try {
                    await request(`${CATEGORIES_API_URL}/${categoryToDelete}`, {
                        method: 'DELETE'
                    });

                    state.currentPage = 1;
                    await loadAndRenderCategories();
                    
                    if (deleteModal) deleteModal.hide();
                    categoryToDelete = null;
                } catch (error) {
                    console.error('Lỗi khi xóa danh mục:', error);
                    alert(`Lỗi: ${error.message}`);
                } finally {
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.innerHTML = 'Xóa';
                }
            }
        });
    }

    tableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const id = parseInt(editBtn.getAttribute('data-id'));
            const categoryRow = editBtn.closest('tr');
            const name = categoryRow.querySelector('h6').textContent;
            const desc = categoryRow.querySelector('td:nth-child(2) span').textContent;

            state.editingId = id;
            document.getElementById('categoryId').value = id;
            document.getElementById('categoryName').value = name;
            document.getElementById('categoryDescription').value = desc;
            
            document.querySelector('#addCategoryModal .modal-title').textContent = 'Sửa danh mục';
            saveBtn.textContent = 'Cập nhật';

            const modal = bootstrap.Modal.getInstance(addModalEl) || new bootstrap.Modal(addModalEl);
            modal.show();
        } else if (deleteBtn) {
            const id = parseInt(deleteBtn.getAttribute('data-id'));
            categoryToDelete = id;
            if (deleteModal) {
                deleteModal.show();
            }
        }
    });

    function escapeHtml(unsafe) {
        return (unsafe || '').toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // Setup search
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.id = 'searchCategory';
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            state.currentPage = 1;
            searchTimeout = setTimeout(() => {
                loadAndRenderCategories();
            }, 300);
        });
    }

    // Initial load
    loadAndRenderCategories();
});
