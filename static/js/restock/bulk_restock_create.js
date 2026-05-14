// // bulk_restock_create.js

// const API_BASE = '/inventory/workflow-bulk-restocks/';
// let currentPage = 1;
// let totalPages = 1;
// let selectedProducts = new Map();
// let currentStoreId = null;

// // ============================================================
// // INITIALIZATION
// // ============================================================
// document.addEventListener('DOMContentLoaded', function () {
//     setupEventListeners();
//     loadCategories();
// });

// // ============================================================
// // EVENT LISTENERS
// // ============================================================
// function setupEventListeners() {

//     // Store selection
//     const storeSelect = document.getElementById('store-select');

//     if (storeSelect) {
//         storeSelect.addEventListener('change', function () {
//             currentStoreId = this.value;

//             if (currentStoreId) {
//                 showSection('filters-section');
//                 showSection('products-section');

//                 currentPage = 1;
//                 loadProducts();
//             } else {
//                 hideSection('filters-section');
//                 hideSection('products-section');
//             }
//         });
//     }

//     // Filters
//     const categoryFilter = document.getElementById('category-filter');
//     const stockFilter = document.getElementById('stock-status-filter');
//     const searchFilter = document.getElementById('search-filter');

//     if (categoryFilter) {
//         categoryFilter.addEventListener('change', () => {
//             currentPage = 1;
//             loadProducts();
//         });
//     }

//     if (stockFilter) {
//         stockFilter.addEventListener('change', () => {
//             currentPage = 1;
//             loadProducts();
//         });
//     }

//     if (searchFilter) {
//         let timeout;

//         searchFilter.addEventListener('input', function () {
//             clearTimeout(timeout);

//             timeout = setTimeout(() => {
//                 currentPage = 1;
//                 loadProducts();
//             }, 400);
//         });
//     }

//     // Selection
//     const selectAllBtn = document.getElementById('select-all-btn');
//     const deselectAllBtn = document.getElementById('deselect-all-btn');

//     if (selectAllBtn) {
//         selectAllBtn.addEventListener('click', selectAllProducts);
//     }

//     if (deselectAllBtn) {
//         deselectAllBtn.addEventListener('click', deselectAllProducts);
//     }

//     // Create draft
//     const createBtn = document.getElementById('create-draft-btn');

//     if (createBtn) {
//         createBtn.addEventListener('click', createDraft);
//     }

//     // Cancel
//     const cancelBtn = document.getElementById('cancel-btn');

//     if (cancelBtn) {
//         cancelBtn.addEventListener('click', function () {
//             window.location.href = '/bulk-restock/';
//         });
//     }
// }

// // ============================================================
// // LOAD CATEGORIES
// // ============================================================
// async function loadCategories() {

//     try {

//         const response = await fetch(
//             `${API_BASE}available_products/?store_id=1&page=1&page_size=1`
//         );

//         const data = await response.json();

//         const categorySelect = document.getElementById('category-filter');

//         if (!categorySelect) return;

//         categorySelect.innerHTML =
//             '<option value="">All Categories</option>';

//         if (data.categories) {

//             data.categories.forEach(category => {

//                 const option = document.createElement('option');

//                 option.value = category.id;
//                 option.textContent = category.name;

//                 categorySelect.appendChild(option);
//             });
//         }

//     } catch (error) {
//         console.error('Error loading categories:', error);
//     }
// }

// // ============================================================
// // LOAD PRODUCTS
// // ============================================================
// async function loadProducts() {

//     if (!currentStoreId) return;

//     showLoading();

//     try {

//         const category =
//             document.getElementById('category-filter')?.value || '';

//         const stockStatus =
//             document.getElementById('stock-status-filter')?.value || '';

//         const search =
//             document.getElementById('search-filter')?.value || '';

//         let url =
//             `${API_BASE}available_products/?store_id=${currentStoreId}&page=${currentPage}&page_size=20`;

//         if (category) {
//             url += `&category_id=${category}`;
//         }

//         if (stockStatus && stockStatus !== 'all') {
//             url += `&stock_status=${stockStatus}`;
//         }

//         if (search) {
//             url += `&search=${encodeURIComponent(search)}`;
//         }

//         const response = await fetch(url);
//         const data = await response.json();

//         displayProducts(data.products || []);
//         updatePagination(data.pagination);

//     } catch (error) {

//         console.error('Error loading products:', error);

//         showError('Failed to load products');

//     }
// }

// // ============================================================
// // DISPLAY PRODUCTS
// // ============================================================
// function displayProducts(products) {

//     const tbody =
//         document.getElementById('products-list-body');

//     if (!tbody) return;

//     if (!products || products.length === 0) {

//         tbody.innerHTML = `
//             <tr>
//                 <td colspan="7" class="empty">
//                     No products found
//                 </td>
//             </tr>
//         `;

//         return;
//     }

//     tbody.innerHTML = products.map(product => {

//         return `
//             <tr>

//                 <td>
//                     <input
//                         type="checkbox"
//                         class="product-checkbox"
//                         data-product-id="${product.id}"
//                         ${selectedProducts.has(product.id) ? 'checked' : ''}
//                         onchange="toggleProductSelection(${product.id}, this.checked)"
//                     >
//                 </td>

//                 <td>${escapeHtml(product.sku)}</td>

//                 <td>${escapeHtml(product.name)}</td>

//                 <td>${escapeHtml(product.category)}</td>

//                 <td class="${product.stock_status === 'low_stock' ? 'text-warning' : ''}">
//                     ${product.current_stock}
//                 </td>

//                 <td>$${product.selling_price}</td>

//                 <td>
//                     <span class="status-badge ${product.stock_status}">
//                         ${getStockStatusText(product.stock_status)}
//                     </span>
//                 </td>

//             </tr>
//         `;

//     }).join('');
// }

// // ============================================================
// // TOGGLE PRODUCT
// // ============================================================
// window.toggleProductSelection = function (productId, checked) {

//     const row = document
//         .querySelector(`input[data-product-id="${productId}"]`)
//         ?.closest('tr');

//     if (!row) return;

//     const cells = row.cells;

//     if (checked) {

//         const product = {
//             id: productId,
//             sku: cells[1].textContent.trim(),
//             name: cells[2].textContent.trim(),
//             category: cells[3].textContent.trim(),
//             current_stock: parseInt(cells[4].textContent.trim()),
//             selling_price: parseFloat(
//                 cells[5].textContent.replace('$', '')
//             ),
//             new_quantity: parseInt(cells[4].textContent.trim()),
//             new_price: parseFloat(
//                 cells[5].textContent.replace('$', '')
//             )
//         };

//         selectedProducts.set(productId, product);

//     } else {

//         selectedProducts.delete(productId);
//     }

//     updateSelectedSummary();
//     updateCreateButtonState();
// };

// // ============================================================
// // SELECT ALL
// // ============================================================
// function selectAllProducts() {

//     document
//         .querySelectorAll('.product-checkbox')
//         .forEach(cb => {

//             cb.checked = true;

//             const productId =
//                 parseInt(cb.dataset.productId);

//             toggleProductSelection(productId, true);
//         });
// }

// // ============================================================
// // DESELECT ALL
// // ============================================================
// function deselectAllProducts() {

//     document
//         .querySelectorAll('.product-checkbox')
//         .forEach(cb => {

//             cb.checked = false;

//             const productId =
//                 parseInt(cb.dataset.productId);

//             toggleProductSelection(productId, false);
//         });
// }

// // ============================================================
// // UPDATE SUMMARY
// // ============================================================
// function updateSelectedSummary() {

//     const summary =
//         document.getElementById('selected-summary');

//     const count =
//         document.getElementById('selected-count');

//     const list =
//         document.getElementById('selected-items-list');

//     if (!summary || !count || !list) return;

//     const total = selectedProducts.size;

//     if (total === 0) {

//         summary.style.display = 'none';
//         return;
//     }

//     summary.style.display = 'block';

//     count.textContent = total;

//     list.innerHTML = `
//         <table class="summary-table">

//             <thead>
//                 <tr>
//                     <th>Product</th>
//                     <th>Current Qty</th>
//                     <th>New Qty</th>
//                     <th>Price</th>
//                     <th></th>
//                 </tr>
//             </thead>

//             <tbody>

//                 ${Array.from(selectedProducts.values()).map(product => `

//                     <tr>

//                         <td>${escapeHtml(product.name)}</td>

//                         <td>${product.current_stock}</td>

//                         <td>
//                             <input
//                                 type="number"
//                                 min="0"
//                                 value="${product.new_quantity}"
//                                 onchange="updateSelectedProductQty(${product.id}, this.value)"
//                             >
//                         </td>

//                         <td>
//                             <input
//                                 type="number"
//                                 min="0"
//                                 step="0.01"
//                                 value="${product.new_price}"
//                                 onchange="updateSelectedProductPrice(${product.id}, this.value)"
//                             >
//                         </td>

//                         <td>
//                             <button
//                                 class="btn-remove"
//                                 onclick="removeSelectedProduct(${product.id})"
//                             >
//                                 ×
//                             </button>
//                         </td>

//                     </tr>

//                 `).join('')}

//             </tbody>

//         </table>
//     `;
// }

// // ============================================================
// // UPDATE QTY
// // ============================================================
// window.updateSelectedProductQty = function (productId, qty) {

//     const product = selectedProducts.get(productId);

//     if (!product) return;

//     product.new_quantity = parseInt(qty) || 0;

//     selectedProducts.set(productId, product);
// };

// // ============================================================
// // UPDATE PRICE
// // ============================================================
// window.updateSelectedProductPrice = function (productId, price) {

//     const product = selectedProducts.get(productId);

//     if (!product) return;

//     product.new_price = parseFloat(price) || 0;

//     selectedProducts.set(productId, product);
// };

// // ============================================================
// // REMOVE PRODUCT
// // ============================================================
// window.removeSelectedProduct = function (productId) {

//     selectedProducts.delete(productId);

//     const checkbox = document.querySelector(
//         `.product-checkbox[data-product-id="${productId}"]`
//     );

//     if (checkbox) {
//         checkbox.checked = false;
//     }

//     updateSelectedSummary();
//     updateCreateButtonState();
// };

// // ============================================================
// // CREATE DRAFT
// // ============================================================
// async function createDraft() {

//     if (selectedProducts.size === 0) {

//         showError('Please select at least one product');
//         return;
//     }

//     try {

//         showLoadingState();

//         const store =
//             document.getElementById('store-select')?.value;

//         const notes =
//             document.getElementById('notes')?.value || '';

//         const category =
//             document.getElementById('category-filter')?.value || null;

//         const payload = {
//             store: parseInt(store),
//             notes: notes,
//             items: Array.from(selectedProducts.values()).map(product => ({
//                 product_id: product.id,
//                 new_quantity: product.new_quantity,
//                 new_price: product.new_price
//             }))
//         };

//         if (category) {
//             payload.category = parseInt(category);
//         }

//         const response = await fetch(
//             `${API_BASE}create_draft/`,
//             {
//                 method: 'POST',

//                 headers: {
//                     'Content-Type': 'application/json',
//                     'X-CSRFToken': getCookie('csrftoken')
//                 },

//                 body: JSON.stringify(payload)
//             }
//         );

//         const result = await response.json();

//         if (!response.ok) {

//             showError(result.error || 'Failed to create draft');
//             resetLoadingState();

//             return;
//         }

//         showSuccess('Draft created successfully');

//         setTimeout(() => {

//             window.location.href =
//                 `/bulk-restock/${result.id}/edit/`;

//         }, 1200);

//     } catch (error) {

//         console.error(error);

//         showError('Network error');

//         resetLoadingState();
//     }
// }

// // ============================================================
// // PAGINATION
// // ============================================================
// function updatePagination(pagination) {

//     const container =
//         document.getElementById('pagination');

//     if (!container) return;

//     if (!pagination || pagination.total_pages <= 1) {

//         container.innerHTML = '';
//         return;
//     }

//     let html = `
//         <div class="pagination-controls">
//     `;

//     if (pagination.current_page > 1) {

//         html += `
//             <button
//                 class="page-btn"
//                 onclick="goToPage(${pagination.current_page - 1})"
//             >
//                 ← Previous
//             </button>
//         `;
//     }

//     html += `
//         <span class="page-info">
//             Page ${pagination.current_page}
//             of
//             ${pagination.total_pages}
//         </span>
//     `;

//     if (pagination.current_page < pagination.total_pages) {

//         html += `
//             <button
//                 class="page-btn"
//                 onclick="goToPage(${pagination.current_page + 1})"
//             >
//                 Next →
//             </button>
//         `;
//     }

//     html += '</div>';

//     container.innerHTML = html;
// }

// window.goToPage = function (page) {

//     currentPage = page;
//     loadProducts();
// };

// // ============================================================
// // HELPERS
// // ============================================================
// function updateCreateButtonState() {

//     const btn =
//         document.getElementById('create-draft-btn');

//     if (!btn) return;

//     btn.disabled = selectedProducts.size === 0;
// }

// function showSection(id) {

//     const el = document.getElementById(id);

//     if (el) {
//         el.style.display = 'block';
//     }
// }

// function hideSection(id) {

//     const el = document.getElementById(id);

//     if (el) {
//         el.style.display = 'none';
//     }
// }

// function showLoading() {

//     const tbody =
//         document.getElementById('products-list-body');

//     if (!tbody) return;

//     tbody.innerHTML = `
//         <tr>
//             <td colspan="7" class="loading">
//                 Loading products...
//             </td>
//         </tr>
//     `;
// }

// function showLoadingState() {

//     const btn =
//         document.getElementById('create-draft-btn');

//     if (!btn) return;

//     btn.disabled = true;
//     btn.textContent = 'Creating Draft...';
// }

// function resetLoadingState() {

//     const btn =
//         document.getElementById('create-draft-btn');

//     if (!btn) return;

//     btn.disabled = false;
//     btn.textContent = 'Create Draft';
// }

// function showError(message) {

//     const error =
//         document.getElementById('error');

//     if (!error) return;

//     error.textContent = message;
//     error.style.display = 'block';

//     setTimeout(() => {
//         error.style.display = 'none';
//     }, 5000);
// }

// function showSuccess(message) {

//     const success =
//         document.getElementById('success');

//     if (!success) return;

//     success.textContent = message;
//     success.style.display = 'block';

//     setTimeout(() => {
//         success.style.display = 'none';
//     }, 5000);
// }

// function getStockStatusText(status) {

//     switch (status) {

//         case 'low_stock':
//             return 'Low Stock';

//         case 'out_of_stock':
//             return 'Out of Stock';

//         default:
//             return 'In Stock';
//     }
// }

// function escapeHtml(text) {

//     if (!text) return '';

//     const div = document.createElement('div');

//     div.textContent = text;

//     return div.innerHTML;
// }

// function getCookie(name) {

//     let cookieValue = null;

//     if (document.cookie && document.cookie !== '') {

//         const cookies = document.cookie.split(';');

//         for (let i = 0; i < cookies.length; i++) {

//             const cookie = cookies[i].trim();

//             if (
//                 cookie.substring(0, name.length + 1) ===
//                 (name + '=')
//             ) {

//                 cookieValue = decodeURIComponent(
//                     cookie.substring(name.length + 1)
//                 );

//                 break;
//             }
//         }
//     }

//     return cookieValue;
// }

// static/inventory/js/bulk_restock_create.js

class BulkRestockCreate {
    constructor() {
        this.selectedProducts = new Map(); // Map of product_id -> {product, quantity}
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.currentStoreId = null;
        this.isLoading = false;
        this.products = [];
        
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        // Store selection
        const storeSelect = document.getElementById('store-select');
        if (storeSelect) {
            storeSelect.addEventListener('change', () => this.onStoreChange());
        }
        
        // Filter buttons
        const applyFilters = document.getElementById('apply-filters');
        if (applyFilters) {
            applyFilters.addEventListener('click', () => this.loadProducts(1));
        }
        
        // Search with debounce
        const searchInput = document.getElementById('filter-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => this.loadProducts(1), 500));
        }
        
        // Select All buttons
        const selectAllBtn = document.getElementById('select-all');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => this.selectAllProducts());
        }
        
        const clearAllBtn = document.getElementById('clear-all');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllProducts());
        }
        
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectAllProducts();
                } else {
                    this.clearAllProducts();
                }
            });
        }
        
        // Create draft button
        const createBtn = document.getElementById('create-draft-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createDraft());
        }
        
        // Cancel button
        const cancelBtn = document.getElementById('cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.location.href = '/inventory/workflow-bulk-restocks/';
            });
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    async onStoreChange() {
        const storeSelect = document.getElementById('store-select');
        this.currentStoreId = storeSelect.value;
        
        if (!this.currentStoreId) {
            document.getElementById('products-section').style.display = 'none';
            return;
        }
        
        // Show products section and load categories
        document.getElementById('products-section').style.display = 'block';
        await this.loadCategories();
        await this.loadProducts(1);
    }
    
    async loadCategories() {
        try {
            const response = await fetch('/inventory/categories/');
            const data = await response.json();
            
            const categorySelect = document.getElementById('filter-category');
            if (categorySelect && data.results) {
                categorySelect.innerHTML = '<option value="">All Categories</option>';
                data.results.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }
    
    async loadProducts(page = 1) {
        if (!this.currentStoreId) return;
        
        this.currentPage = page;
        this.showLoading();
        
        try {
            const params = this.getProductParams();
            const url = `/inventory/workflow-bulk-restocks/available_products/?${params.toString()}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.products) {
                this.products = data.products;
                this.totalPages = data.pagination.total_pages;
                this.renderProductsTable();
                this.renderPagination();
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Failed to load products. Please try again.');
        } finally {
            this.hideLoading();
        }
    }
    
    getProductParams() {
        const params = new URLSearchParams();
        params.append('store_id', this.currentStoreId);
        params.append('page', this.currentPage);
        params.append('page_size', this.pageSize);
        
        const category = document.getElementById('filter-category')?.value;
        if (category) params.append('category_id', category);
        
        const stockStatus = document.getElementById('filter-stock-status')?.value;
        if (stockStatus && stockStatus !== 'all') params.append('stock_status', stockStatus);
        
        const search = document.getElementById('filter-search')?.value;
        if (search) params.append('search', search);
        
        return params;
    }
    
    renderProductsTable() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;
        
        if (!this.products || this.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty">No products found</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.products.map(product => {
            const isSelected = this.selectedProducts.has(product.id);
            const quantity = isSelected ? this.selectedProducts.get(product.id).quantity : product.reorder_level || 1;
            
            return `
                <tr data-product-id="${product.id}">
                    <td>
                        <input type="checkbox" class="product-select" 
                               data-product-id="${product.id}"
                               ${isSelected ? 'checked' : ''}>
                    </td>
                    <td>${this.escapeHtml(product.sku)}</td>
                    <td><strong>${this.escapeHtml(product.name)}</strong></td>
                    <td>${this.escapeHtml(product.category)}</td>
                    <td>${product.current_stock}</td>
                    <td>${product.reorder_level || '-'}</td>
                    <td>${this.getStockStatusBadge(product.stock_status)}</td>
                    <td>$${product.selling_price.toFixed(2)}</td>
                    <td>
                        <input type="number" class="quantity-input" 
                               data-product-id="${product.id}"
                               value="${quantity}"
                               min="1"
                               ${isSelected ? '' : 'disabled'}>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Bind events to new elements
        document.querySelectorAll('.product-select').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.toggleProductSelection(e));
        });
        
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => this.updateProductQuantity(e));
        });
        
        // Update select all checkbox state
        this.updateSelectAllCheckbox();
    }
    
    getStockStatusBadge(status) {
        const badges = {
            'low_stock': '<span class="stock-badge stock-low">Low Stock</span>',
            'out_of_stock': '<span class="stock-badge stock-out">Out of Stock</span>',
            'in_stock': '<span class="stock-badge stock-in">In Stock</span>'
        };
        return badges[status] || '<span class="stock-badge">Unknown</span>';
    }
    
    toggleProductSelection(event) {
        const checkbox = event.target;
        const productId = parseInt(checkbox.dataset.productId);
        const product = this.products.find(p => p.id === productId);
        
        if (checkbox.checked) {
            // Add to selected products
            const quantity = parseInt(document.querySelector(`.quantity-input[data-product-id="${productId}"]`).value) || 1;
            this.selectedProducts.set(productId, {
                product: product,
                quantity: quantity
            });
            // Enable quantity input
            const qtyInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
            if (qtyInput) qtyInput.disabled = false;
        } else {
            // Remove from selected products
            this.selectedProducts.delete(productId);
            // Disable quantity input
            const qtyInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
            if (qtyInput) qtyInput.disabled = true;
        }
        
        this.updateSelectedProductsList();
        this.updateCreateButtonState();
        this.updateSelectAllCheckbox();
    }
    
    updateProductQuantity(event) {
        const input = event.target;
        const productId = parseInt(input.dataset.productId);
        let quantity = parseInt(input.value);
        
        if (isNaN(quantity) || quantity < 1) {
            quantity = 1;
            input.value = 1;
        }
        
        if (this.selectedProducts.has(productId)) {
            const selected = this.selectedProducts.get(productId);
            selected.quantity = quantity;
            this.selectedProducts.set(productId, selected);
            this.updateSelectedProductsList();
        }
    }
    
    selectAllProducts() {
        this.products.forEach(product => {
            if (!this.selectedProducts.has(product.id)) {
                this.selectedProducts.set(product.id, {
                    product: product,
                    quantity: product.reorder_level || 1
                });
            }
        });
        
        this.renderProductsTable();
        this.updateSelectedProductsList();
        this.updateCreateButtonState();
    }
    
    clearAllProducts() {
        this.selectedProducts.clear();
        this.renderProductsTable();
        this.updateSelectedProductsList();
        this.updateCreateButtonState();
    }
    
    updateSelectedProductsList() {
        const container = document.getElementById('selected-products-list');
        const countSpan = document.getElementById('selected-count');
        
        if (!container) return;
        
        const selectedCount = this.selectedProducts.size;
        if (countSpan) countSpan.textContent = selectedCount;
        
        if (selectedCount === 0) {
            container.innerHTML = '<div class="empty-selected">No products selected yet</div>';
            return;
        }
        
        container.innerHTML = Array.from(this.selectedProducts.values()).map(selected => `
            <div class="selected-product-item" data-product-id="${selected.product.id}">
                <div class="selected-product-info">
                    <span class="selected-product-name">${this.escapeHtml(selected.product.name)}</span>
                    <span class="selected-product-sku">${selected.product.sku}</span>
                </div>
                <div class="selected-product-details">
                    <span>Price: $${selected.product.selling_price.toFixed(2)}</span>
                    <input type="number" class="selected-quantity" 
                           data-product-id="${selected.product.id}"
                           value="${selected.quantity}"
                           min="1"
                           style="width: 80px;">
                    <span>Total: $${(selected.product.selling_price * selected.quantity).toFixed(2)}</span>
                    <button class="remove-item-btn" data-product-id="${selected.product.id}">Remove</button>
                </div>
            </div>
        `).join('');
        
        // Bind events for selected items
        document.querySelectorAll('.selected-quantity').forEach(input => {
            input.addEventListener('change', (e) => this.updateSelectedQuantity(e));
        });
        
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.removeSelectedItem(e));
        });
    }
    
    updateSelectedQuantity(event) {
        const input = event.target;
        const productId = parseInt(input.dataset.productId);
        let quantity = parseInt(input.value);
        
        if (isNaN(quantity) || quantity < 1) {
            quantity = 1;
            input.value = 1;
        }
        
        if (this.selectedProducts.has(productId)) {
            const selected = this.selectedProducts.get(productId);
            selected.quantity = quantity;
            this.selectedProducts.set(productId, selected);
            
            // Update quantity in products table
            const tableQtyInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
            if (tableQtyInput) tableQtyInput.value = quantity;
            
            this.updateSelectedProductsList(); // Refresh to update totals
        }
    }
    
    removeSelectedItem(event) {
        const btn = event.target;
        const productId = parseInt(btn.dataset.productId);
        
        this.selectedProducts.delete(productId);
        
        // Update checkbox in products table
        const checkbox = document.querySelector(`.product-select[data-product-id="${productId}"]`);
        if (checkbox) checkbox.checked = false;
        
        // Disable quantity input
        const qtyInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
        if (qtyInput) qtyInput.disabled = true;
        
        this.updateSelectedProductsList();
        this.updateCreateButtonState();
        this.updateSelectAllCheckbox();
    }
    
    updateCreateButtonState() {
        const createBtn = document.getElementById('create-draft-btn');
        if (createBtn) {
            createBtn.disabled = this.selectedProducts.size === 0;
        }
    }
    
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('select-all-checkbox');
        if (!selectAllCheckbox || this.products.length === 0) return;
        
        const allSelected = this.products.every(product => this.selectedProducts.has(product.id));
        selectAllCheckbox.checked = allSelected;
    }
    
    async createDraft() {
        if (this.selectedProducts.size === 0) {
            this.showError('Please select at least one product');
            return;
        }
        
        this.showLoading();
        
        const items = Array.from(this.selectedProducts.values()).map(selected => ({
            product_id: selected.product.id,
            quantity: selected.quantity,
            price: selected.product.selling_price
        }));
        
        const data = {
            store: parseInt(this.currentStoreId),
            items: items
        };
        
        try {
            const response = await fetch('/inventory/workflow-bulk-restocks/create_draft/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Redirect to edit page
                window.location.href = `/inventory/workflow-bulk-restocks/${result.id}/edit/`;
            } else {
                this.showError(result.error || 'Failed to create restock draft');
            }
        } catch (error) {
            console.error('Error creating draft:', error);
            this.showError('An error occurred. Please try again.');
        } finally {
            this.hideLoading();
        }
    }
    
    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;
        
        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '<button class="pagination-btn" id="first-page" ' + (this.currentPage === 1 ? 'disabled' : '') + '>First</button>';
        html += '<button class="pagination-btn" id="prev-page" ' + (this.currentPage === 1 ? 'disabled' : '') + '>Previous</button>';
        
        // Show page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        html += '<button class="pagination-btn" id="next-page" ' + (this.currentPage === this.totalPages ? 'disabled' : '') + '>Next</button>';
        html += '<button class="pagination-btn" id="last-page" ' + (this.currentPage === this.totalPages ? 'disabled' : '') + '>Last</button>';
        
        container.innerHTML = html;
        
        // Bind pagination events
        document.getElementById('first-page')?.addEventListener('click', () => this.loadProducts(1));
        document.getElementById('prev-page')?.addEventListener('click', () => this.loadProducts(this.currentPage - 1));
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => this.loadProducts(parseInt(btn.dataset.page)));
        });
        document.getElementById('next-page')?.addEventListener('click', () => this.loadProducts(this.currentPage + 1));
        document.getElementById('last-page')?.addEventListener('click', () => this.loadProducts(this.totalPages));
    }
    
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showLoading() {
        this.isLoading = true;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'flex';
    }
    
    hideLoading() {
        this.isLoading = false;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    showError(message) {
        alert(message); // You can replace with a toast notification
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.bulkRestockCreate = new BulkRestockCreate();
});