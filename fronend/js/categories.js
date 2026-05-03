const STORAGE_KEY_CATEGORIES = 'bistro_categories';

document.addEventListener('DOMContentLoaded', () => {
    let categories = getCategories();
    
    const tableBody = document.getElementById('categoriesTableBody');
    const categoryForm = document.getElementById('categoryForm');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const addModalEl = document.getElementById('addCategoryModal');
    let editingId = null;

    // Reset modal on close
    if (addModalEl) {
        addModalEl.addEventListener('hidden.bs.modal', () => {
            categoryForm.reset();
            document.getElementById('categoryId').value = '';
            document.querySelector('#addCategoryModal .modal-title').textContent = 'Thêm danh mục mới';
            saveBtn.textContent = 'Lưu danh mục';
            editingId = null;
        });
    }

    function getCategories() {
        // data.js will have already initialized localStorage, but fallback just in case
        const data = localStorage.getItem(STORAGE_KEY_CATEGORIES);
        if (data) {
            return JSON.parse(data);
        }
        const defaultData = window.BistroMockData?.MOCK_CATEGORIES || [];
        localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(defaultData));
        return defaultData.slice();
    }

    function saveCategories() {
        localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    }

    let currentPage = 1;
    const itemsPerPage = 10;
    let filteredCategories = [];

    function renderPagination() {
        const paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1;
        
        // Prev button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="prev">Trước</a>`;
        paginationContainer.appendChild(prevLi);
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const li = document.createElement('li');
            li.className = `page-item ${currentPage === i ? 'active' : ''}`;
            const activeClasses = currentPage === i ? 'bg-primary text-white' : 'text-secondary bg-light';
            li.innerHTML = `<a class="page-link rounded-pill border-0 ${activeClasses} px-3" href="#" data-page="${i}">${i}</a>`;
            paginationContainer.appendChild(li);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link rounded-pill border-0 text-secondary bg-light px-3" href="#" data-page="next">Sau</a>`;
        paginationContainer.appendChild(nextLi);
        
        // Add event listeners
        paginationContainer.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                if (page === 'prev' && currentPage > 1) {
                    currentPage--;
                    renderTable(false);
                } else if (page === 'next' && currentPage < totalPages) {
                    currentPage++;
                    renderTable(false);
                } else if (page !== 'prev' && page !== 'next') {
                    currentPage = parseInt(page);
                    renderTable(false);
                }
            });
        });
    }

    function renderTable(resetPage = false) {
        if (resetPage) currentPage = 1;

        // Apply filters
        const searchInput = document.getElementById('searchCategory');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const statusFilter = document.getElementById('statusFilter') ? document.getElementById('statusFilter').value : 'Tất cả';

        filteredCategories = categories.filter(c => {
            const matchSearch = c.name.toLowerCase().includes(searchTerm) || (c.description || '').toLowerCase().includes(searchTerm);
            const matchStatus = statusFilter === 'Tất cả' || c.status === statusFilter;
            return matchSearch && matchStatus;
        });

        tableBody.innerHTML = '';
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = filteredCategories.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Không tìm thấy danh mục.</td></tr>`;
        } else {
            pageData.forEach(cat => {
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
        
        renderPagination();
    }

    // Handle form submit/save
    saveBtn.addEventListener('click', () => {
        const nameInput = document.getElementById('categoryName').value.trim();
        const descInput = document.getElementById('categoryDescription').value.trim();

        if (!nameInput) {
            alert('Vui lòng nhập tên danh mục.');
            return;
        }

        if (editingId) {
            // Edit
            const cat = categories.find(c => c.id === editingId);
            if (cat) {
                cat.name = nameInput;
                cat.description = descInput;
            }
        } else {
            // Add new
            const newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
            categories.push({
                id: newId,
                name: nameInput,
                description: descInput,
                count: 0,
                status: 'Hoạt động'
            });
        }

        saveCategories();
        renderTable();
        
        const modal = bootstrap.Modal.getInstance(addModalEl);
        if (modal) modal.hide();
    });

    // Handle Edit / Delete Actions
    let categoryToDelete = null;
    const deleteModalEl = document.getElementById('deleteCategoryModal');
    const deleteModal = deleteModalEl ? new bootstrap.Modal(deleteModalEl) : null;
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (categoryToDelete !== null) {
                categories = categories.filter(c => c.id !== categoryToDelete);
                saveCategories();
                renderTable();
                if (deleteModal) deleteModal.hide();
                categoryToDelete = null;
            }
        });
    }

    tableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
            const id = parseInt(editBtn.getAttribute('data-id'));
            const cat = categories.find(c => c.id === id);
            if (cat) {
                editingId = id;
                document.getElementById('categoryId').value = id;
                document.getElementById('categoryName').value = cat.name;
                document.getElementById('categoryDescription').value = cat.description || '';
                
                document.querySelector('#addCategoryModal .modal-title').textContent = 'Sửa danh mục';
                saveBtn.textContent = 'Cập nhật';

                const modal = bootstrap.Modal.getInstance(addModalEl) || new bootstrap.Modal(addModalEl);
                modal.show();
            }
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

    renderTable();

    // Setup simple search
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.id = 'searchCategory';
        searchInput.addEventListener('input', (e) => {
            renderTable(true);
        });
    }
});
