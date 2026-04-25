/* ============================================================
   SIMPLIFIED PRODUCTS MANAGEMENT with BARCODE PRINTING
   (SKU & Barcode are auto-generated - removed from form)
============================================================ */

const PRODUCTS_CONFIG = {
    API_ENDPOINTS: {
        PRODUCTS: '/inventory/products/',
        PRODUCT_DETAIL: (id) => `/inventory/products/${id}/`,
        UPDATE_STORE_STOCK: (id) => `/inventory/products/${id}/update_store_stock/`,
        CATEGORIES: '/inventory/categories/',
        STORES: '/inventory/stores/',
        PRINT_BARCODE: (id) => `/inventory/print-barcode/${id}/`,
        PRINT_MULTIPLE_BARCODES: '/inventory/print-multiple-barcodes/'
    },

    SELECTORS: {
        // Main elements
        PRODUCT_TABLE_BODY: '#products-table-body',
        PRODUCT_MODAL: '#product-modal',
        STOCK_MODAL: '#stock-modal',
        ERROR_DIV: '#error',
        SUCCESS_DIV: '#success',
        
        // Product modal (SKU and Barcode REMOVED)
        MODAL_TITLE: '#product-modal-title',
        FORM_ERROR: '#product-form-error',
        PRODUCT_NAME: '#product-name',
        PRODUCT_CATEGORY: '#product-category',
        PRODUCT_DESCRIPTION: '#product-description',
        COST_PRICE: '#cost-price',
        SELLING_PRICE: '#selling-price',
        REORDER_LEVEL: '#reorder-level',
        IS_ACTIVE: '#is-active',
        SUBMIT_BUTTON: '#product-submit',
        CANCEL_BUTTON: '#product-cancel',
        LOADING_SPINNER: '#product-loading',
        
        // Stock modal
        STOCK_FORM_ERROR: '#stock-form-error',
        STOCK_PRODUCT_INFO: '#stock-product-info',
        STORE_SELECT: '#store-select',
        QUANTITY_INPUT: '#quantity-input',
        STOCK_ACTION: '#stock-action',
        STOCK_NOTES: '#stock-notes',
        UPDATE_STOCK_BUTTON: '#update-stock-btn',
        CLOSE_STOCK_MODAL: '#close-stock-modal',
        STOCK_LOADING: '#stock-loading',
        
        // Filters
        SEARCH_INPUT: '#search-input',
        CATEGORY_FILTER: '#category-filter',
        STOCK_STATUS_FILTER: '#stock-status-filter',
        STATUS_FILTER: '#status-filter',
        
        // Stats
        TOTAL_PRODUCTS: '#total-products',
        LOW_STOCK_COUNT: '#low-stock-count',
        OUT_OF_STOCK_COUNT: '#out-of-stock-count',
        
        // Buttons
        NEW_PRODUCT_BTN: '#new-product-btn',
        PRINT_BARCODES_BTN: '#print-barcodes-btn',
        SELECT_ALL: '#select-all-products',
        
        // Pagination
        PREV_PAGE: '#prev-page',
        NEXT_PAGE: '#next-page',
        PAGE_INFO: '#page-info'
    },

    MESSAGES: {
        SUCCESS_ADD: 'Product added successfully (SKU & Barcode auto-generated)',
        SUCCESS_UPDATE: 'Product updated successfully',
        SUCCESS_DELETE: 'Product deleted successfully',
        SUCCESS_STOCK_UPDATE: 'Stock updated successfully',
        SUCCESS_BARCODE_PRINT: 'Barcode label sent to printer',
        
        ERROR_FETCH: 'Error fetching products',
        ERROR_SAVE: 'Error saving product',
        ERROR_DELETE: 'Error deleting product',
        ERROR_STOCK_UPDATE: 'Error updating stock',
        ERROR_VALIDATION: 'Please check the form for errors',
        ERROR_PRINT: 'Error printing barcode',
        
        VALIDATION: {
            NAME_REQUIRED: 'Product name is required',
            NAME_LENGTH: 'Product name must be between 2 and 200 characters',
            CATEGORY_REQUIRED: 'Category is required',
            PRICE_REQUIRED: 'Price is required',
            PRICE_POSITIVE: 'Price must be greater than 0',
            SELLING_GREATER: 'Selling price must be greater than cost price',
            REORDER_POSITIVE: 'Reorder level must be 0 or greater'
        },
        
        LOADING: 'Loading...',
        SAVING: 'Saving...',
        DELETING: 'Deleting...',
        UPDATING_STOCK: 'Updating stock...'
    },

    CONSTRAINTS: {
        NAME_MIN_LENGTH: 2,
        NAME_MAX_LENGTH: 200,
        DESC_MAX_LENGTH: 500
    },

    DEFAULT_FILTERS: {
        page: 1,
        page_size: 20,
        search: '',
        category: '',
        stock_status: '',
        ordering: 'name',
        is_active: ''
    }
};

class ProductState {
    constructor() {
        this.editId = null;
        this.isLoading = false;
        this.products = [];
        this.categories = [];
        this.stores = [];
        this.filters = { ...PRODUCTS_CONFIG.DEFAULT_FILTERS };
        this.csrfToken = this.getCSRFToken();
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.stats = { total: 0, low_stock: 0, out_of_stock: 0 };
        this.selectedProducts = new Set();
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }
}

class ProductUtils {
    static showError(message, duration = 5000) {
        const errorDiv = document.querySelector(PRODUCTS_CONFIG.SELECTORS.ERROR_DIV);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            if (duration > 0) {
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, duration);
            }
        }
        console.error('Product Error:', message);
    }

    static hideError() {
        const errorDiv = document.querySelector(PRODUCTS_CONFIG.SELECTORS.ERROR_DIV);
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    static showSuccess(message, duration = 3000) {
        const successDiv = document.querySelector(PRODUCTS_CONFIG.SELECTORS.SUCCESS_DIV);
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
            
            if (duration > 0) {
                setTimeout(() => {
                    successDiv.style.display = 'none';
                }, duration);
            }
        }
    }

    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }

    static formatNumber(number) {
        return new Intl.NumberFormat('en-US').format(number || 0);
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static getStockStatusClass(availableStock, reorderLevel) {
        if (availableStock === 0) return 'status-out-stock';
        if (availableStock <= reorderLevel) return 'status-low-stock';
        return 'status-in-stock';
    }

    static getStockStatusText(availableStock, reorderLevel) {
        if (availableStock === 0) return 'Out of Stock';
        if (availableStock <= reorderLevel) return 'Low Stock';
        return 'In Stock';
    }

    static validateProduct(formData) {
        ProductUtils.hideError();
        
        const errors = [];
        
        if (!formData.name || formData.name.trim() === '') {
            errors.push(PRODUCTS_CONFIG.MESSAGES.VALIDATION.NAME_REQUIRED);
        } else if (formData.name.trim().length < PRODUCTS_CONFIG.CONSTRAINTS.NAME_MIN_LENGTH ||
                   formData.name.trim().length > PRODUCTS_CONFIG.CONSTRAINTS.NAME_MAX_LENGTH) {
            errors.push(PRODUCTS_CONFIG.MESSAGES.VALIDATION.NAME_LENGTH);
        }
        
        if (!formData.category) {
            errors.push(PRODUCTS_CONFIG.MESSAGES.VALIDATION.CATEGORY_REQUIRED);
        }
        
        if (!formData.selling_price || parseFloat(formData.selling_price) <= 0) {
            errors.push(PRODUCTS_CONFIG.MESSAGES.VALIDATION.PRICE_REQUIRED);
        }
        
        if (formData.cost_price && parseFloat(formData.cost_price) < 0) {
            errors.push(PRODUCTS_CONFIG.MESSAGES.VALIDATION.PRICE_POSITIVE);
        }
        
        if (formData.selling_price && formData.cost_price &&
            parseFloat(formData.selling_price) < parseFloat(formData.cost_price)) {
            errors.push(PRODUCTS_CONFIG.MESSAGES.VALIDATION.SELLING_GREATER);
        }
        
        if (formData.reorder_level && parseFloat(formData.reorder_level) < 0) {
            errors.push(PRODUCTS_CONFIG.MESSAGES.VALIDATION.REORDER_POSITIVE);
        }
        
        if (errors.length > 0) {
            ProductUtils.showError(errors.join('<br>'));
            return false;
        }
        
        return true;
    }

    static debounce(func, wait) {
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
}

class ProductAPIService {
    async makeRequest(url, method = 'GET', data = null) {
        const csrfToken = window.productState?.csrfToken || document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken || ''
        };

        const config = {
            method: method,
            headers: headers,
            credentials: 'same-origin'
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            
            if (response.status === 403) {
                throw new Error('CSRF verification failed. Please refresh the page.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
            }

            if (response.status === 204) {
                return true;
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error;
        }
    }

    async fetchProducts(params = '') {
        const url = params ? `${PRODUCTS_CONFIG.API_ENDPOINTS.PRODUCTS}?${params}` : PRODUCTS_CONFIG.API_ENDPOINTS.PRODUCTS;
        return this.makeRequest(url, 'GET');
    }

    async fetchProduct(id) {
        return this.makeRequest(PRODUCTS_CONFIG.API_ENDPOINTS.PRODUCT_DETAIL(id), 'GET');
    }

    async createProduct(productData) {
        return this.makeRequest(PRODUCTS_CONFIG.API_ENDPOINTS.PRODUCTS, 'POST', productData);
    }

    async updateProduct(id, productData) {
        return this.makeRequest(PRODUCTS_CONFIG.API_ENDPOINTS.PRODUCT_DETAIL(id), 'PUT', productData);
    }

    async deleteProduct(id) {
        return this.makeRequest(PRODUCTS_CONFIG.API_ENDPOINTS.PRODUCT_DETAIL(id), 'DELETE');
    }

    async updateStoreStock(productId, storeId, quantity, action = 'set') {
        const data = {
            store_id: storeId,
            quantity: parseInt(quantity),
            action: action
        };
        
        return this.makeRequest(
            PRODUCTS_CONFIG.API_ENDPOINTS.UPDATE_STORE_STOCK(productId),
            'POST',
            data
        );
    }

    async fetchCategories() {
        return this.makeRequest(PRODUCTS_CONFIG.API_ENDPOINTS.CATEGORIES, 'GET');
    }

    async fetchStores() {
        return this.makeRequest(PRODUCTS_CONFIG.API_ENDPOINTS.STORES, 'GET');
    }
}

class ProductManager {
    constructor() {
        this.state = new ProductState();
        this.apiService = new ProductAPIService();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadData();
    }

    bindEvents() {
        document.querySelector(PRODUCTS_CONFIG.SELECTORS.NEW_PRODUCT_BTN)?.addEventListener('click', () => this.openProductModal());
        document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRINT_BARCODES_BTN)?.addEventListener('click', () => this.printSelectedBarcodes());
        document.querySelector(PRODUCTS_CONFIG.SELECTORS.SELECT_ALL)?.addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
        
        document.querySelector(PRODUCTS_CONFIG.SELECTORS.SUBMIT_BUTTON)?.addEventListener('click', () => this.submitProduct());
        document.querySelector(PRODUCTS_CONFIG.SELECTORS.CANCEL_BUTTON)?.addEventListener('click', () => this.closeProductModal());
        
        document.querySelector(PRODUCTS_CONFIG.SELECTORS.UPDATE_STOCK_BUTTON)?.addEventListener('click', () => this.submitStockUpdate());
        document.querySelector(PRODUCTS_CONFIG.SELECTORS.CLOSE_STOCK_MODAL)?.addEventListener('click', () => this.closeStockModal());
        
        const searchInput = document.querySelector(PRODUCTS_CONFIG.SELECTORS.SEARCH_INPUT);
        if (searchInput) {
            const debouncedSearch = ProductUtils.debounce(() => {
                this.state.filters.search = searchInput.value;
                this.state.currentPage = 1;
                this.loadProducts();
            }, 300);
            searchInput.addEventListener('input', debouncedSearch);
        }
        
        const categoryFilter = document.querySelector(PRODUCTS_CONFIG.SELECTORS.CATEGORY_FILTER);
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.state.filters.category = categoryFilter.value;
                this.state.currentPage = 1;
                this.loadProducts();
            });
        }
        
        const stockFilter = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STOCK_STATUS_FILTER);
        if (stockFilter) {
            stockFilter.addEventListener('change', () => {
                this.state.filters.stock_status = stockFilter.value;
                this.state.currentPage = 1;
                this.loadProducts();
            });
        }
        
        const statusFilter = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STATUS_FILTER);
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.state.filters.is_active = statusFilter.value;
                this.state.currentPage = 1;
                this.loadProducts();
            });
        }
        
        document.querySelector(PRODUCTS_CONFIG.SELECTORS.PREV_PAGE)?.addEventListener('click', () => this.prevPage());
        document.querySelector(PRODUCTS_CONFIG.SELECTORS.NEXT_PAGE)?.addEventListener('click', () => this.nextPage());
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeProductModal();
                this.closeStockModal();
            }
        });
    }

    async loadData() {
        try {
            const [categories, stores] = await Promise.all([
                this.apiService.fetchCategories(),
                this.apiService.fetchStores()
            ]);
            
            this.state.categories = categories;
            this.state.stores = stores;
            
            this.renderCategories();
            this.renderStores();
            this.loadProducts();
        } catch (error) {
            ProductUtils.showError(PRODUCTS_CONFIG.MESSAGES.ERROR_FETCH);
            console.error('Error loading data:', error);
        }
    }

    async loadProducts() {
        try {
            this.state.isLoading = true;
            ProductUtils.hideError();
            
            const params = new URLSearchParams();
            Object.entries(this.state.filters).forEach(([key, value]) => {
                if (value !== '' && value !== null && value !== undefined) {
                    params.append(key, value);
                }
            });
            
            const response = await this.apiService.fetchProducts(params.toString());
            this.state.products = response.results || response;
            this.state.totalItems = response.count || response.length;
            this.state.totalPages = Math.ceil(this.state.totalItems / PRODUCTS_CONFIG.DEFAULT_FILTERS.page_size);
            
            this.renderProducts();
            this.calculateStats();
            this.updatePagination();
        } catch (error) {
            ProductUtils.showError(PRODUCTS_CONFIG.MESSAGES.ERROR_FETCH);
        } finally {
            this.state.isLoading = false;
        }
    }

    calculateStats() {
        let lowStock = 0;
        let outOfStock = 0;
        
        this.state.products.forEach(product => {
            if (product.available_stock === 0) {
                outOfStock++;
            } else if (product.available_stock <= (product.reorder_level || 0)) {
                lowStock++;
            }
        });
        
        this.state.stats = {
            total: this.state.totalItems,
            low_stock: lowStock,
            out_of_stock: outOfStock
        };
        
        this.renderStats();
    }

    renderProducts() {
        const tbody = document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRODUCT_TABLE_BODY);
        if (!tbody) return;
        
        if (!this.state.products.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: 40px;">
                        <h3>No products found</h3>
                        <p>Create your first product by clicking "New Product"</p>
                        <p style="font-size:12px; color:#666; margin-top:10px;">
                            <i class="fas fa-info-circle"></i> SKU and Barcode are auto-generated
                        </p>
                    </td>
                </tr>`;
            return;
        }
        
        tbody.innerHTML = '';
        this.state.products.forEach(product => {
            const row = document.createElement('tr');
            const stockStatusClass = ProductUtils.getStockStatusClass(product.available_stock, product.reorder_level);
            const stockStatusText = ProductUtils.getStockStatusText(product.available_stock, product.reorder_level);
            
            row.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="product-checkbox" data-id="${product.id}" ${this.state.selectedProducts.has(product.id) ? 'checked' : ''}>
                </td>
                <td>
                    <strong>${ProductUtils.escapeHtml(product.name)}</strong>
                    ${product.sku ? `<br><small>SKU: ${ProductUtils.escapeHtml(product.sku)}</small>` : ''}
                </td>
                <td class="barcode-cell">${product.barcode ? ProductUtils.escapeHtml(product.barcode) : '<span style="color:#999;">No barcode</span>'}</td>
                <td>${product.category_name || 'Uncategorized'}</td>
                <td>${ProductUtils.formatCurrency(product.selling_price)}</td>
                <td>${ProductUtils.formatNumber(product.available_stock || 0)}</td>
                <td>${ProductUtils.formatNumber(product.reorder_level || 0)}</td>
                <td>
                    <span class="status-badge ${stockStatusClass}">
                        ${stockStatusText}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${product.is_active ? 'status-active' : 'status-inactive'}">
                        ${product.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(product.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn-edit" data-id="${product.id}">Edit</button>
                    <button class="btn-delete" data-id="${product.id}" ${product.available_stock > 0 ? 'disabled' : ''}>Delete</button>
                    <button class="btn-stock" data-id="${product.id}">Stock</button>
                    ${product.barcode ? `<button class="btn-barcode" data-id="${product.id}">🏷️ Print</button>` : ''}
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.editProduct(btn.dataset.id));
        });
        
        tbody.querySelectorAll('.btn-delete').forEach(btn => {
            if (!btn.disabled) {
                btn.addEventListener('click', () => this.deleteProduct(btn.dataset.id));
            }
        });
        
        tbody.querySelectorAll('.btn-stock').forEach(btn => {
            btn.addEventListener('click', () => this.openStockModal(btn.dataset.id));
        });
        
        tbody.querySelectorAll('.btn-barcode').forEach(btn => {
            btn.addEventListener('click', () => this.printSingleBarcode(btn.dataset.id));
        });
        
        tbody.querySelectorAll('.product-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const productId = parseInt(e.target.dataset.id);
                if (e.target.checked) {
                    this.state.selectedProducts.add(productId);
                } else {
                    this.state.selectedProducts.delete(productId);
                }
                this.updateSelectAllCheckbox();
            });
        });
    }

    printSingleBarcode(productId) {
        const url = PRODUCTS_CONFIG.API_ENDPOINTS.PRINT_BARCODE(productId);
        window.open(url, '_blank');
        ProductUtils.showSuccess(PRODUCTS_CONFIG.MESSAGES.SUCCESS_BARCODE_PRINT);
    }

    printSelectedBarcodes() {
        if (this.state.selectedProducts.size === 0) {
            ProductUtils.showError('Please select at least one product to print barcodes');
            return;
        }
        
        const ids = Array.from(this.state.selectedProducts).join(',');
        const url = `${PRODUCTS_CONFIG.API_ENDPOINTS.PRINT_MULTIPLE_BARCODES}?ids=${ids}`;
        window.open(url, '_blank');
        ProductUtils.showSuccess(`Printing ${this.state.selectedProducts.size} barcode(s)`);
    }

    toggleSelectAll(checked) {
        this.state.products.forEach(product => {
            if (checked) {
                this.state.selectedProducts.add(product.id);
            } else {
                this.state.selectedProducts.delete(product.id);
            }
        });
        
        document.querySelectorAll('.product-checkbox').forEach(cb => {
            cb.checked = checked;
        });
    }

    updateSelectAllCheckbox() {
        const selectAll = document.querySelector(PRODUCTS_CONFIG.SELECTORS.SELECT_ALL);
        if (selectAll) {
            const visibleProducts = this.state.products.map(p => p.id);
            const selectedVisible = visibleProducts.filter(id => this.state.selectedProducts.has(id));
            selectAll.checked = selectedVisible.length === visibleProducts.length && visibleProducts.length > 0;
            selectAll.indeterminate = selectedVisible.length > 0 && selectedVisible.length < visibleProducts.length;
        }
    }

    renderCategories() {
        ['PRODUCT_CATEGORY', 'CATEGORY_FILTER'].forEach(selector => {
            const el = document.querySelector(PRODUCTS_CONFIG.SELECTORS[selector]);
            if (el) {
                const defaultValue = selector === 'CATEGORY_FILTER' ? '' : 'Select Category';
                el.innerHTML = `<option value="">${defaultValue}</option>`;
                this.state.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    el.appendChild(option);
                });
            }
        });
    }

    renderStores() {
        const storeSelect = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STORE_SELECT);
        if (storeSelect) {
            storeSelect.innerHTML = '<option value="">Select Store</option>';
            this.state.stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = `${store.name} (${store.store_type})`;
                storeSelect.appendChild(option);
            });
        }
    }

    renderStats() {
        const totalEl = document.querySelector(PRODUCTS_CONFIG.SELECTORS.TOTAL_PRODUCTS);
        const lowStockEl = document.querySelector(PRODUCTS_CONFIG.SELECTORS.LOW_STOCK_COUNT);
        const outStockEl = document.querySelector(PRODUCTS_CONFIG.SELECTORS.OUT_OF_STOCK_COUNT);
        
        if (totalEl) totalEl.textContent = this.state.stats.total;
        if (lowStockEl) lowStockEl.textContent = this.state.stats.low_stock;
        if (outStockEl) outStockEl.textContent = this.state.stats.out_of_stock;
    }

    updatePagination() {
        const pageInfo = document.querySelector(PRODUCTS_CONFIG.SELECTORS.PAGE_INFO);
        const prevBtn = document.querySelector(PRODUCTS_CONFIG.SELECTORS.PREV_PAGE);
        const nextBtn = document.querySelector(PRODUCTS_CONFIG.SELECTORS.NEXT_PAGE);
        
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.state.currentPage} of ${this.state.totalPages}`;
        }
        if (prevBtn) {
            prevBtn.disabled = this.state.currentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.state.currentPage >= this.state.totalPages;
        }
    }

    openProductModal(product = null) {
        const modal = document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRODUCT_MODAL);
        const title = document.querySelector(PRODUCTS_CONFIG.SELECTORS.MODAL_TITLE);
        
        if (!modal || !title) return;
        
        if (product) {
            title.textContent = 'Edit Product';
            this.state.editId = product.id;
            this.fillProductForm(product);
        } else {
            title.textContent = 'New Product';
            this.clearProductForm();
            this.state.editId = null;
        }
        
        modal.style.display = 'block';
        this.showBackdrop();
    }

    closeProductModal() {
        const modal = document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRODUCT_MODAL);
        if (modal) {
            modal.style.display = 'none';
        }
        this.clearProductForm();
        this.state.editId = null;
        this.hideBackdrop();
        this.hideFormError();
    }

    async editProduct(id) {
        try {
            const product = await this.apiService.fetchProduct(id);
            this.openProductModal(product);
        } catch (error) {
            ProductUtils.showError('Error loading product');
        }
    }

    async submitProduct() {
        const formData = {
            name: document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRODUCT_NAME)?.value || '',
            category: document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRODUCT_CATEGORY)?.value || '',
            description: document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRODUCT_DESCRIPTION)?.value || '',
            cost_price: document.querySelector(PRODUCTS_CONFIG.SELECTORS.COST_PRICE)?.value || '',
            selling_price: document.querySelector(PRODUCTS_CONFIG.SELECTORS.SELLING_PRICE)?.value || '',
            reorder_level: document.querySelector(PRODUCTS_CONFIG.SELECTORS.REORDER_LEVEL)?.value || 10,
            is_active: document.querySelector(PRODUCTS_CONFIG.SELECTORS.IS_ACTIVE)?.checked || true
        };
        
        if (!ProductUtils.validateProduct(formData)) return;
        
        try {
            this.setLoading(true, 'product');
            
            if (this.state.editId) {
                await this.apiService.updateProduct(this.state.editId, formData);
                ProductUtils.showSuccess(PRODUCTS_CONFIG.MESSAGES.SUCCESS_UPDATE);
            } else {
                await this.apiService.createProduct(formData);
                ProductUtils.showSuccess(PRODUCTS_CONFIG.MESSAGES.SUCCESS_ADD);
            }
            
            this.closeProductModal();
            await this.loadProducts();
        } catch (error) {
            this.showFormError(error.message || PRODUCTS_CONFIG.MESSAGES.ERROR_SAVE);
        } finally {
            this.setLoading(false, 'product');
        }
    }

    async deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            return;
        }
        
        try {
            this.setLoading(true, 'product');
            await this.apiService.deleteProduct(id);
            ProductUtils.showSuccess(PRODUCTS_CONFIG.MESSAGES.SUCCESS_DELETE);
            await this.loadProducts();
        } catch (error) {
            ProductUtils.showError(error.message || PRODUCTS_CONFIG.MESSAGES.ERROR_DELETE);
        } finally {
            this.setLoading(false, 'product');
        }
    }

    async openStockModal(productId) {
        try {
            const product = await this.apiService.fetchProduct(productId);
            const modal = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STOCK_MODAL);
            const infoDiv = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STOCK_PRODUCT_INFO);
            
            if (!modal || !infoDiv) return;
            
            infoDiv.textContent = `${product.name} (SKU: ${product.sku}) - Current Stock: ${product.available_stock || 0}`;
            modal.dataset.productId = productId;
            
            modal.style.display = 'block';
            this.showBackdrop();
        } catch (error) {
            ProductUtils.showError('Error loading product');
        }
    }

    closeStockModal() {
        const modal = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STOCK_MODAL);
        if (modal) {
            modal.style.display = 'none';
            delete modal.dataset.productId;
        }
        this.hideBackdrop();
        this.hideStockFormError();
    }

    async submitStockUpdate() {
        const modal = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STOCK_MODAL);
        const productId = modal?.dataset.productId;
        
        if (!productId) return;
        
        const storeId = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STORE_SELECT)?.value;
        const quantity = document.querySelector(PRODUCTS_CONFIG.SELECTORS.QUANTITY_INPUT)?.value;
        const action = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STOCK_ACTION)?.value;
        
        if (!storeId || !quantity || quantity < 1) {
            this.showStockFormError('Please select a store and enter a valid quantity');
            return;
        }
        
        try {
            this.setLoading(true, 'stock');
            await this.apiService.updateStoreStock(productId, storeId, quantity, action);
            ProductUtils.showSuccess(PRODUCTS_CONFIG.MESSAGES.SUCCESS_STOCK_UPDATE);
            this.closeStockModal();
            await this.loadProducts();
        } catch (error) {
            this.showStockFormError(error.message || PRODUCTS_CONFIG.MESSAGES.ERROR_STOCK_UPDATE);
        } finally {
            this.setLoading(false, 'stock');
        }
    }

    fillProductForm(product) {
        const nameInput = document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRODUCT_NAME);
        const categorySelect = document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRODUCT_CATEGORY);
        const descriptionInput = document.querySelector(PRODUCTS_CONFIG.SELECTORS.PRODUCT_DESCRIPTION);
        const costInput = document.querySelector(PRODUCTS_CONFIG.SELECTORS.COST_PRICE);
        const sellingInput = document.querySelector(PRODUCTS_CONFIG.SELECTORS.SELLING_PRICE);
        const reorderInput = document.querySelector(PRODUCTS_CONFIG.SELECTORS.REORDER_LEVEL);
        const activeCheckbox = document.querySelector(PRODUCTS_CONFIG.SELECTORS.IS_ACTIVE);
        
        if (nameInput) nameInput.value = product.name || '';
        if (categorySelect) categorySelect.value = product.category || '';
        if (descriptionInput) descriptionInput.value = product.description || '';
        if (costInput) costInput.value = product.cost_price || '';
        if (sellingInput) sellingInput.value = product.selling_price || '';
        if (reorderInput) reorderInput.value = product.reorder_level || 10;
        if (activeCheckbox) activeCheckbox.checked = product.is_active !== false;
    }

    clearProductForm() {
        const form = document.getElementById('product-form');
        if (form) form.reset();
        
        const reorderInput = document.querySelector(PRODUCTS_CONFIG.SELECTORS.REORDER_LEVEL);
        if (reorderInput) reorderInput.value = 10;
    }

    setLoading(isLoading, type = 'product') {
        if (type === 'product') {
            const btn = document.querySelector(PRODUCTS_CONFIG.SELECTORS.SUBMIT_BUTTON);
            const spinner = document.querySelector(PRODUCTS_CONFIG.SELECTORS.LOADING_SPINNER);
            if (btn) {
                btn.disabled = isLoading;
                btn.textContent = isLoading ? 'Saving...' : (this.state.editId ? 'Update Product' : 'Save Product');
            }
            if (spinner) {
                spinner.style.display = isLoading ? 'inline' : 'none';
            }
        } else if (type === 'stock') {
            const btn = document.querySelector(PRODUCTS_CONFIG.SELECTORS.UPDATE_STOCK_BUTTON);
            const spinner = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STOCK_LOADING);
            if (btn) {
                btn.disabled = isLoading;
                btn.textContent = isLoading ? 'Updating...' : 'Update Stock';
            }
            if (spinner) {
                spinner.style.display = isLoading ? 'inline' : 'none';
            }
        }
    }

    showFormError(message) {
        const div = document.querySelector(PRODUCTS_CONFIG.SELECTORS.FORM_ERROR);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
        }
    }

    hideFormError() {
        const div = document.querySelector(PRODUCTS_CONFIG.SELECTORS.FORM_ERROR);
        if (div) div.style.display = 'none';
    }

    showStockFormError(message) {
        const div = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STOCK_FORM_ERROR);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
        }
    }

    hideStockFormError() {
        const div = document.querySelector(PRODUCTS_CONFIG.SELECTORS.STOCK_FORM_ERROR);
        if (div) div.style.display = 'none';
    }

    showBackdrop() {
        let backdrop = document.querySelector('.modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            document.body.appendChild(backdrop);
        }
        backdrop.classList.add('active');
    }

    hideBackdrop() {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.classList.remove('active');
        }
    }

    prevPage() {
        if (this.state.currentPage > 1) {
            this.state.currentPage--;
            this.state.filters.page = this.state.currentPage;
            this.loadProducts();
        }
    }

    nextPage() {
        if (this.state.currentPage < this.state.totalPages) {
            this.state.currentPage++;
            this.state.filters.page = this.state.currentPage;
            this.loadProducts();
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== Product Manager Initialized ===');
    console.log('SKU and Barcode are auto-generated by backend');
    window.productManager = new ProductManager();
});