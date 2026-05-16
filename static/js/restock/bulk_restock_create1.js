
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
                    
                    <label>
                        Price:
                        <input type="number"
                               class="selected-price"
                               data-product-id="${selected.product.id}"
                               value="${selected.product.selling_price}"
                               step="0.01"
                               min="0"
                               style="width: 100px;">
                    </label>

                    <label>
                        Qty:
                        <input type="number"
                               class="selected-quantity"
                               data-product-id="${selected.product.id}"
                               value="${selected.quantity}"
                               min="1"
                               style="width: 80px;">
                    </label>

                    <span>
                        Total: $${(selected.product.selling_price * selected.quantity).toFixed(2)}
                    </span>

                    <button class="remove-item-btn"
                            data-product-id="${selected.product.id}">
                        Remove
                    </button>
                </div>
            </div>
        `).join('');
        
        // Bind events for selected items
        document.querySelectorAll('.selected-quantity').forEach(input => {
            input.addEventListener('change', (e) => this.updateSelectedQuantity(e));
        });

        document.querySelectorAll('.selected-price').forEach(input => {
            input.addEventListener('change', (e) => this.updateSelectedPrice(e));
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
    
    updateSelectedPrice(event) {
        const input = event.target;
        const productId = parseInt(input.dataset.productId);

        let price = parseFloat(input.value);

        if (isNaN(price) || price < 0) {
            price = 0;
            input.value = 0;
        }

        if (this.selectedProducts.has(productId)) {
            const selected = this.selectedProducts.get(productId);

            // Update price
            selected.product.selling_price = price;

            this.selectedProducts.set(productId, selected);

            // Refresh totals
            this.updateSelectedProductsList();
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
    
    // async createDraft() {
    //     if (this.selectedProducts.size === 0) {
    //         this.showError('Please select at least one product');
    //         return;
    //     }
        
    //     this.showLoading();
        
    //     const items = Array.from(this.selectedProducts.values()).map(selected => ({
    //         product_id: selected.product.id,
    //         quantity: selected.quantity,
    //         price: selected.product.selling_price
    //     }));
        
    //     const data = {
    //         store: parseInt(this.currentStoreId),
    //         items: items
    //     };
        
    //     try {
    //         const response = await fetch('/inventory/workflow-bulk-restocks/create_draft/', {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'X-CSRFToken': this.getCookie('csrftoken')
    //             },
    //             body: JSON.stringify(data)
    //         });
    //         console.log("the response is ", response)
    //         const result = await response.json();
            
    //         if (response.ok) {
    //             // Redirect to edit page
    //             window.location.href = `/inventory/workflow-bulk-restocks/${result.id}/edit/`;
    //         } else {
    //             this.showError(result.error || 'Failed to create restock draft');
    //         }
    //     } catch (error) {
    //         console.error('Error creating draft:', error);
    //         this.showError('An error occurred. Please try again.');
    //     } finally {
    //         this.hideLoading();
    //     }
    // }
    async createDraft() {
        console.log('=== CREATE DRAFT STARTED ===');

        if (this.selectedProducts.size === 0) {
            console.warn('No products selected');
            this.showError('Please select at least one product');
            return;
        }

        // Log the raw selected products
        console.log('Raw selectedProducts Map:', this.selectedProducts);

        this.showLoading();

        // Transform selected products into items array
        const items = Array.from(this.selectedProducts.values()).map(selected => {
            console.log('Preparing item for submission:', selected);
            return {
                product_id: selected.product.id,
                quantity: selected.quantity,
                price: selected.product.selling_price
            };
        });

        console.log('Prepared items array for submission:', items);

        // Prepare final data payload
        const data = {
            store: parseInt(this.currentStoreId),
            items: items
        };

        console.log('Final payload ready to submit:', data);

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
                console.log('Draft created successfully, redirecting to edit page:', result.id);
                window.location.href = `/inventory/workflow-bulk-restocks/${result.id}/edit/`;
            } else {
                console.error('Backend returned error:', result);
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
