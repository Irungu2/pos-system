/* ============================================================
    STORE STOCK MANAGEMENT MODULE - COMPLETE FIXED VERSION
    Compatible with Django StoreStockViewSet + StoreStockSerializer
    Manages inventory across different stores
============================================================ */

/* =============================
   CONFIGURATION
============================= */
const STORESTOCK_CONFIG = {
    API_ENDPOINTS: {
        STORE_STOCKS: '/inventory/store-stocks/',
        STORE_STOCK_DETAIL: (id) => `/inventory/store-stocks/${id}/`,
        STORES: '/inventory/stores/',
        PRODUCTS: '/inventory/products/',
        LOW_STOCK_ALERTS: '/inventory/store-stocks/low_stock_alerts/',
        RETAIL_STOCK: '/inventory/store-stocks/retail_stock/',
    },

    SELECTORS: {
        // Modal selectors
        ADJUST_MODAL: '#adjust-modal',
        CREATE_MODAL: '#create-modal',
        MODAL_ERROR: '#modal-error',
        ADJUST_ERROR: '#adjust-error',
        CREATE_ERROR: '#create-error',
        ADJUST_QUANTITY: '#adjust-quantity',
        CREATE_QUANTITY: '#create-quantity',
        ADJUST_ACTION: '#adjust-action',
        CREATE_ACTION: '#create-action',
        ADJUST_NOTES: '#adjust-notes',
        CREATE_NOTES: '#create-notes',
        ADJUST_SUBMIT: '#adjust-submit',
        CREATE_SUBMIT: '#create-submit',
        ADJUST_CANCEL: '#adjust-cancel',
        CREATE_CANCEL: '#create-cancel',
        MODAL_CLOSE_BTNS: '.modal-close-btn',
        
        // Modal info selectors
        ADJUST_PRODUCT_NAME: '#adjust-product-name',
        ADJUST_PRODUCT_SKU: '#adjust-product-sku',
        ADJUST_STORE_NAME: '#adjust-store-name',
        ADJUST_CURRENT_QTY: '#adjust-current-qty',
        
        // Create modal selectors
        CREATE_STORE: '#create-store',
        CREATE_PRODUCT: '#create-product',
        CREATE_PRODUCT_SEARCH: '#create-product-search',
        CREATE_STORE_SEARCH: '#create-store-search',
        
        // Filter selectors
        FILTER_STORE: '#filter-store',
        FILTER_PRODUCT: '#filter-product',
        FILTER_LOW_STOCK: '#filter-low-stock',
        FILTER_STORE_TYPE: '#filter-store-type',
        CLEAR_FILTERS: '#clear-filters',
        
        // Display selectors
        STOCK_LIST: '#stock-list',
        STOCK_COUNT: '#stock-count',
        ERROR_DIV: '#stock-error',
        
        // Stats selectors
        TOTAL_STORES: '#total-stores',
        LOW_STOCK_COUNT: '#low-stock-count',
        RETAIL_COUNT: '#retail-count',
        
        // Action buttons
        CREATE_BUTTON: '#create-stock-btn',
    },

    MESSAGES: {
        LOADING: 'Loading inventory...',
        SAVING: 'Saving adjustment...',
        CREATING: 'Creating stock record...',
        SUCCESS_UPDATE: 'Stock updated successfully',
        SUCCESS_ADJUST: 'Stock adjustment saved successfully',
        SUCCESS_CREATE: 'Stock record created successfully',
        ERROR_FETCH: 'Error loading inventory data',
        ERROR_SAVE: 'Error saving stock adjustment',
        ERROR_CREATE: 'Error creating stock record',
        ERROR_DELETE: 'Error deleting stock record',
        ERROR_DUPLICATE: 'Stock record already exists for this store and product',
        CSRF_ERROR: 'CSRF verification failed. Please refresh the page.',

        VALIDATION: {
            QUANTITY_REQUIRED: 'Quantity is required',
            QUANTITY_NEGATIVE: 'Quantity cannot be negative',
            STORE_REQUIRED: 'Please select a store',
            PRODUCT_REQUIRED: 'Please select a product',
            QUANTITY_INTEGER: 'Quantity must be a whole number',
        }
    },

    CONSTRAINTS: {
        QUANTITY_MIN: 0,
        QUANTITY_MAX: 999999,
    }
};

/* =============================
   CSRF TOKEN MANAGER (Fixed Version)
============================= */
class CSRFTokenManager {
    static getCookie(name) {
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

    static getToken() {
        // Try to get from cookie first
        let token = this.getCookie('csrftoken');
        
        // If not in cookie, try form input
        if (!token) {
            const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
            token = csrfInput ? csrfInput.value : null;
        }
        
        // Debug logging
        console.log('CSRF Token found:', token ? `Yes (length: ${token.length})` : 'No');
        
        return token;
    }
}

/* =============================
   STATE MANAGEMENT
============================= */
class StoreStockState {
    constructor() {
        this.stocks = [];
        this.stores = [];
        this.products = [];
        this.allProducts = [];
        this.filteredStocks = [];
        this.filters = {
            store: '',
            product: '',
            low_stock: '',
            store_type: ''
        };
        this.currentAdjustmentId = null;
        this.currentAction = null; // 'adjust' or 'create'
        this.isLoading = false;
        this.csrfToken = CSRFTokenManager.getToken();
        this.stats = {
            totalStores: 0,
            lowStockCount: 0,
            retailCount: 0
        };
    }

    setLoading(isLoading, action = 'adjust') {
        this.isLoading = isLoading;
        
        if (action === 'adjust') {
            const btn = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_SUBMIT);
            if (btn) {
                btn.disabled = isLoading;
                btn.textContent = isLoading ? STORESTOCK_CONFIG.MESSAGES.SAVING : "Save Adjustment";
            }
        } else if (action === 'create') {
            const btn = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_SUBMIT);
            if (btn) {
                btn.disabled = isLoading;
                btn.textContent = isLoading ? STORESTOCK_CONFIG.MESSAGES.CREATING : "Create Stock";
            }
        }
    }

    applyFilters() {
        let filtered = [...this.stocks];

        // Apply store filter
        if (this.filters.store) {
            filtered = filtered.filter(stock => stock.store == this.filters.store);
        }

        // Apply product filter (search by name or SKU)
        if (this.filters.product) {
            const searchTerm = this.filters.product.toLowerCase();
            filtered = filtered.filter(stock => 
                (stock.product_name && stock.product_name.toLowerCase().includes(searchTerm)) ||
                (stock.product_sku && stock.product_sku.toLowerCase().includes(searchTerm))
            );
        }

        // Apply low stock filter
        if (this.filters.low_stock === 'true') {
            filtered = filtered.filter(stock => stock.is_low_stock);
        } else if (this.filters.low_stock === 'false') {
            filtered = filtered.filter(stock => !stock.is_low_stock);
        }

        // Apply store type filter
        if (this.filters.store_type) {
            filtered = filtered.filter(stock => stock.store_type === this.filters.store_type);
        }

        this.filteredStocks = filtered;
        return filtered;
    }

    getStats() {
        const totalStores = new Set(this.stocks.map(s => s.store)).size;
        const lowStockCount = this.stocks.filter(s => s.is_low_stock).length;
        const retailCount = this.stocks.filter(s => s.store_type === 'RETAIL').length;
        
        this.stats = { totalStores, lowStockCount, retailCount };
        return this.stats;
    }

    openAdjustModal(stockId) {
        this.currentAction = 'adjust';
        this.currentAdjustmentId = stockId;
        const modal = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_MODAL);
        if (modal) {
            modal.style.display = 'flex';
            modal.offsetHeight; // Force reflow
        }
    }

    closeAdjustModal() {
        this.currentAction = null;
        this.currentAdjustmentId = null;
        const modal = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_MODAL);
        if (modal) {
            modal.style.display = 'none';
        }
        this.resetAdjustForm();
    }

    resetAdjustForm() {
        const quantityInput = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_QUANTITY);
        const actionSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_ACTION);
        const notesTextarea = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_NOTES);
        
        if (quantityInput) quantityInput.value = '0';
        if (actionSelect) actionSelect.value = 'set';
        if (notesTextarea) notesTextarea.value = '';
        
        StoreStockUtils.hideAdjustError();
    }

    openCreateModal() {
        this.currentAction = 'create';
        const modal = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_MODAL);
        if (modal) {
            modal.style.display = 'flex';
            modal.offsetHeight; // Force reflow
        }
    }

    closeCreateModal() {
        this.currentAction = null;
        const modal = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_MODAL);
        if (modal) {
            modal.style.display = 'none';
        }
        this.resetCreateForm();
    }

    resetCreateForm() {
        const storeSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_STORE);
        const productSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_PRODUCT);
        const quantityInput = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_QUANTITY);
        const notesTextarea = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_NOTES);
        
        if (storeSelect) storeSelect.value = '';
        if (productSelect) productSelect.value = '';
        if (quantityInput) quantityInput.value = '0';
        if (notesTextarea) notesTextarea.value = '';
        
        StoreStockUtils.hideCreateError();
    }
}

/* =============================
   UTILITIES
============================= */
class StoreStockUtils {
    static showError(message, duration = 5000) {
        const div = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ERROR_DIV);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
            div.style.color = '#dc3545';
            div.style.backgroundColor = '#f8d7da';
            div.style.border = '1px solid #f5c6cb';
            div.style.borderRadius = '4px';
            div.style.padding = '12px';
            div.style.margin = '10px 0';
            
            if (duration > 0) {
                setTimeout(() => {
                    div.style.display = 'none';
                }, duration);
            }
        }
        console.error('Store Stock Error:', message);
    }

    static hideError() {
        const div = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ERROR_DIV);
        if (div) {
            div.style.display = 'none';
        }
    }

    static showAdjustError(message, duration = 5000) {
        const div = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_ERROR);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
            div.style.color = '#dc3545';
            div.style.backgroundColor = '#f8d7da';
            div.style.border = '1px solid #f5c6cb';
            div.style.borderRadius = '4px';
            div.style.padding = '12px';
            div.style.margin = '10px 0';
            
            if (duration > 0) {
                setTimeout(() => {
                    div.style.display = 'none';
                }, duration);
            }
        }
    }

    static hideAdjustError() {
        const div = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_ERROR);
        if (div) {
            div.style.display = 'none';
        }
    }

    static showCreateError(message, duration = 5000) {
        const div = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_ERROR);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
            div.style.color = '#dc3545';
            div.style.backgroundColor = '#f8d7da';
            div.style.border = '1px solid #f5c6cb';
            div.style.borderRadius = '4px';
            div.style.padding = '12px';
            div.style.margin = '10px 0';
            
            if (duration > 0) {
                setTimeout(() => {
                    div.style.display = 'none';
                }, duration);
            }
        }
    }

    static hideCreateError() {
        const div = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_ERROR);
        if (div) {
            div.style.display = 'none';
        }
    }

    static showSuccess(message, duration = 3000) {
        const successDiv = document.createElement('div');
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, duration);
    }

    static validateAdjustment(data) {
        StoreStockUtils.hideAdjustError();

        const quantity = parseInt(data.quantity);
        if (isNaN(quantity) || quantity < STORESTOCK_CONFIG.CONSTRAINTS.QUANTITY_MIN) {
            StoreStockUtils.showAdjustError(STORESTOCK_CONFIG.MESSAGES.VALIDATION.QUANTITY_REQUIRED);
            return false;
        }

        if (quantity > STORESTOCK_CONFIG.CONSTRAINTS.QUANTITY_MAX) {
            StoreStockUtils.showAdjustError(`Quantity cannot exceed ${STORESTOCK_CONFIG.CONSTRAINTS.QUANTITY_MAX}`);
            return false;
        }

        return true;
    }

    static validateCreate(data) {
        StoreStockUtils.hideCreateError();

        if (!data.store) {
            StoreStockUtils.showCreateError(STORESTOCK_CONFIG.MESSAGES.VALIDATION.STORE_REQUIRED);
            return false;
        }

        if (!data.product) {
            StoreStockUtils.showCreateError(STORESTOCK_CONFIG.MESSAGES.VALIDATION.PRODUCT_REQUIRED);
            return false;
        }

        const quantity = parseInt(data.quantity);
        if (isNaN(quantity) || quantity < STORESTOCK_CONFIG.CONSTRAINTS.QUANTITY_MIN) {
            StoreStockUtils.showCreateError(STORESTOCK_CONFIG.MESSAGES.VALIDATION.QUANTITY_INTEGER);
            return false;
        }

        if (quantity > STORESTOCK_CONFIG.CONSTRAINTS.QUANTITY_MAX) {
            StoreStockUtils.showCreateError(`Quantity cannot exceed ${STORESTOCK_CONFIG.CONSTRAINTS.QUANTITY_MAX}`);
            return false;
        }

        return true;
    }

    static formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
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

/* =============================
   API SERVICE (Fixed CSRF Handling)
============================= */
class StoreStockAPI {
    constructor() {
        this.csrfToken = CSRFTokenManager.getToken();
    }

    async makeRequest(url, method = 'GET', data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRFToken': this.csrfToken || ''
        };

        const config = {
            method: method,
            headers: headers,
            credentials: 'same-origin'
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        console.log(`Making ${method} request to ${url} with CSRF token:`, 
                   this.csrfToken ? 'Present' : 'Missing');

        try {
            const response = await fetch(url, config);
            
            if (response.status === 403) {
                const errorData = await response.json();
                console.error('CSRF Error Details:', errorData);
                throw new Error(STORESTOCK_CONFIG.MESSAGES.CSRF_ERROR);
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
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

    async list() {
        return this.makeRequest(STORESTOCK_CONFIG.API_ENDPOINTS.STORE_STOCKS, 'GET');
    }

    async stores() {
        return this.makeRequest(STORESTOCK_CONFIG.API_ENDPOINTS.STORES, 'GET');
    }

    async products() {
        return this.makeRequest(STORESTOCK_CONFIG.API_ENDPOINTS.PRODUCTS, 'GET');
    }

    async create(data) {
        return this.makeRequest(STORESTOCK_CONFIG.API_ENDPOINTS.STORE_STOCKS, 'POST', data);
    }

    async update(id, data) {
        return this.makeRequest(
            STORESTOCK_CONFIG.API_ENDPOINTS.STORE_STOCK_DETAIL(id),
            'PUT', 
            data
        );
    }

    async adjustStock(id, data) {
        return this.makeRequest(
            STORESTOCK_CONFIG.API_ENDPOINTS.STORE_STOCK_DETAIL(id),
            'PATCH',
            data
        );
    }

    async checkExisting(storeId, productId) {
        const url = new URL(STORESTOCK_CONFIG.API_ENDPOINTS.STORE_STOCKS);
        url.searchParams.append('store', storeId);
        url.searchParams.append('product', productId);
        
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return data.length > 0 ? data[0] : null;
    }

    async lowStockAlerts() {
        return this.makeRequest(STORESTOCK_CONFIG.API_ENDPOINTS.LOW_STOCK_ALERTS, 'GET');
    }
}

/* =============================
   UI RENDERER
============================= */
class StoreStockUI {
    static renderStores(stores, selector) {
        const select = document.querySelector(selector);
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Store</option>';
        
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = `${store.name} (${store.store_type})`;
            select.appendChild(option);
        });
    }

    static renderProducts(products, selector) {
        const select = document.querySelector(selector);
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Product</option>';
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (${product.sku})`;
            option.dataset.category = product.category || '';
            option.dataset.price = product.price || '0';
            select.appendChild(option);
        });
    }

    static renderStats(stats) {
        const totalStoresEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.TOTAL_STORES);
        const lowStockCountEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.LOW_STOCK_COUNT);
        const retailCountEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.RETAIL_COUNT);
        
        if (totalStoresEl) totalStoresEl.textContent = stats.totalStores;
        if (lowStockCountEl) lowStockCountEl.textContent = stats.lowStockCount;
        if (retailCountEl) retailCountEl.textContent = stats.retailCount;
    }

    static renderList(stocks) {
        const tbody = document.querySelector(STORESTOCK_CONFIG.SELECTORS.STOCK_LIST);
        if (!tbody) return;
        
        tbody.innerHTML = "";

        if (!stocks || stocks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <h3>No stock records found</h3>
                        <p>Try adjusting your filters or add stock to stores</p>
                    </td>
                </tr>
            `;
            return;
        }

        stocks.forEach(stock => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${StoreStockUtils.escapeHtml(stock.product_name)}</td>
                <td>${StoreStockUtils.escapeHtml(stock.product_sku)}</td>
                <td>${StoreStockUtils.escapeHtml(stock.product_category || '—')}</td>
                <td>${StoreStockUtils.escapeHtml(stock.store_name)}</td>
                <td>${stock.store_type === 'WAREHOUSE' ? 'Warehouse' : 'Retail'}</td>
                <td>
                    <span class="stock-level ${stock.is_low_stock ? 'stock-low' : 'stock-adequate'}">
                        ${stock.quantity}
                    </span>
                </td>
                <td>
                    <span class="stock-status ${stock.is_low_stock ? 'status-low' : 'status-ok'}">
                        ${stock.is_low_stock ? 'Low Stock' : 'Adequate'}
                    </span>
                </td>
                <td>${StoreStockUtils.formatDate(stock.last_updated)}</td>
                <td class="actions-cell">
                    <button class="btn-primary btn-adjust" data-id="${stock.id}">Adjust</button>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Add event listeners to adjust buttons
        tbody.querySelectorAll('.btn-adjust').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stockId = e.target.dataset.id;
                if (window.storeStockController) {
                    window.storeStockController.openAdjustModal(stockId);
                }
            });
        });

        // Update count
        const countElement = document.querySelector(STORESTOCK_CONFIG.SELECTORS.STOCK_COUNT);
        if (countElement) {
            countElement.textContent = `${stocks.length} stock record${stocks.length !== 1 ? 's' : ''}`;
        }
    }

    static updateAdjustModal(stock) {
        const productNameEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_PRODUCT_NAME);
        const productSkuEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_PRODUCT_SKU);
        const storeNameEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_STORE_NAME);
        const currentQtyEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_CURRENT_QTY);
        const quantityInput = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_QUANTITY);
        
        if (productNameEl) productNameEl.textContent = stock.product_name || 'N/A';
        if (productSkuEl) productSkuEl.textContent = stock.product_sku || 'N/A';
        if (storeNameEl) storeNameEl.textContent = stock.store_name || 'N/A';
        if (currentQtyEl) currentQtyEl.textContent = stock.quantity || 0;
        if (quantityInput) quantityInput.value = stock.quantity || 0;
        
        // Set focus to quantity field
        setTimeout(() => {
            if (quantityInput) quantityInput.focus();
        }, 100);
    }

    static setupCreateSearch() {
        // Product search
        const productSearch = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_PRODUCT_SEARCH);
        const productSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_PRODUCT);
        
        if (productSearch && productSelect) {
            productSearch.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const options = productSelect.options;
                
                for (let i = 0; i < options.length; i++) {
                    const option = options[i];
                    const text = option.textContent.toLowerCase();
                    option.style.display = text.includes(searchTerm) ? '' : 'none';
                }
            });
        }

        // Store search
        const storeSearch = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_STORE_SEARCH);
        const storeSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_STORE);
        
        if (storeSearch && storeSelect) {
            storeSearch.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const options = storeSelect.options;
                
                for (let i = 0; i < options.length; i++) {
                    const option = options[i];
                    const text = option.textContent.toLowerCase();
                    option.style.display = text.includes(searchTerm) ? '' : 'none';
                }
            });
        }
    }
}

/* =============================
   MAIN CONTROLLER
============================= */
class StoreStockController {
    constructor() {
        this.state = window.storeStockState;
        this.api = new StoreStockAPI();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Filter events
        const filters = [
            STORESTOCK_CONFIG.SELECTORS.FILTER_STORE,
            STORESTOCK_CONFIG.SELECTORS.FILTER_LOW_STOCK,
            STORESTOCK_CONFIG.SELECTORS.FILTER_STORE_TYPE
        ];

        filters.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener('change', () => this.applyFilters());
            }
        });

        // Product search input with debounce
        const productFilter = document.querySelector(STORESTOCK_CONFIG.SELECTORS.FILTER_PRODUCT);
        if (productFilter) {
            const debouncedApplyFilters = StoreStockUtils.debounce(() => {
                this.state.filters.product = productFilter.value;
                this.applyFilters();
            }, 500);
            
            productFilter.addEventListener('input', debouncedApplyFilters);
        }

        // Clear filters
        const clearBtn = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CLEAR_FILTERS);
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }

        // Create button
        const createBtn = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_BUTTON);
        if (createBtn) {
            createBtn.addEventListener('click', () => this.openCreateModal());
        }

        // Modal events
        this.setupModalEvents();
    }

    setupModalEvents() {
        // Adjust modal events
        const adjustCancelBtn = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_CANCEL);
        if (adjustCancelBtn) {
            adjustCancelBtn.addEventListener('click', () => this.closeAdjustModal());
        }

        const adjustSubmitBtn = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_SUBMIT);
        if (adjustSubmitBtn) {
            adjustSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitAdjustment();
            });
        }

        const adjustModal = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_MODAL);
        if (adjustModal) {
            adjustModal.addEventListener('click', (e) => {
                if (e.target === adjustModal) {
                    this.closeAdjustModal();
                }
            });
        }

        const adjustQuantityInput = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_QUANTITY);
        if (adjustQuantityInput) {
            adjustQuantityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submitAdjustment();
                }
            });
        }

        // Create modal events
        const createCancelBtn = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_CANCEL);
        if (createCancelBtn) {
            createCancelBtn.addEventListener('click', () => this.closeCreateModal());
        }

        const createSubmitBtn = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_SUBMIT);
        if (createSubmitBtn) {
            createSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitCreate();
            });
        }

        const createModal = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_MODAL);
        if (createModal) {
            createModal.addEventListener('click', (e) => {
                if (e.target === createModal) {
                    this.closeCreateModal();
                }
            });
        }

        const createQuantityInput = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_QUANTITY);
        if (createQuantityInput) {
            createQuantityInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submitCreate();
                }
            });
        }

        // Close buttons for all modals
        document.querySelectorAll(STORESTOCK_CONFIG.SELECTORS.MODAL_CLOSE_BTNS).forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.state.currentAction === 'adjust') {
                    this.closeAdjustModal();
                } else if (this.state.currentAction === 'create') {
                    this.closeCreateModal();
                }
            });
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.state.currentAction === 'adjust') {
                    this.closeAdjustModal();
                } else if (this.state.currentAction === 'create') {
                    this.closeCreateModal();
                }
            }
        });
    }

    async load() {
        try {
            this.state.setLoading(true, 'adjust');
            StoreStockUtils.hideError();

            // Load stores for filter and create
            const stores = await this.api.stores();
            this.state.stores = stores;
            StoreStockUI.renderStores(stores, STORESTOCK_CONFIG.SELECTORS.FILTER_STORE);
            StoreStockUI.renderStores(stores, STORESTOCK_CONFIG.SELECTORS.CREATE_STORE);

            // Load products for create modal
            const products = await this.api.products();
            this.state.allProducts = products;
            StoreStockUI.renderProducts(products, STORESTOCK_CONFIG.SELECTORS.CREATE_PRODUCT);
            StoreStockUI.setupCreateSearch();

            // Load store stocks
            const stocks = await this.api.list();
            this.state.stocks = stocks;
            this.state.filteredStocks = stocks;

            // Calculate and display stats
            const stats = this.state.getStats();
            StoreStockUI.renderStats(stats);

            // Display filtered list
            StoreStockUI.renderList(this.state.filteredStocks);

        } catch (err) {
            StoreStockUtils.showError(STORESTOCK_CONFIG.MESSAGES.ERROR_FETCH);
            console.error('Error loading store stocks:', err);
        } finally {
            this.state.setLoading(false, 'adjust');
        }
    }

    applyFilters() {
        // Update state with current filter values
        const storeFilter = document.querySelector(STORESTOCK_CONFIG.SELECTORS.FILTER_STORE);
        const lowStockFilter = document.querySelector(STORESTOCK_CONFIG.SELECTORS.FILTER_LOW_STOCK);
        const storeTypeFilter = document.querySelector(STORESTOCK_CONFIG.SELECTORS.FILTER_STORE_TYPE);
        
        if (storeFilter) this.state.filters.store = storeFilter.value;
        if (lowStockFilter) this.state.filters.low_stock = lowStockFilter.value;
        if (storeTypeFilter) this.state.filters.store_type = storeTypeFilter.value;

        // Apply filters and update display
        const filtered = this.state.applyFilters();
        StoreStockUI.renderList(filtered);
    }

    clearFilters() {
        const storeFilter = document.querySelector(STORESTOCK_CONFIG.SELECTORS.FILTER_STORE);
        const productFilter = document.querySelector(STORESTOCK_CONFIG.SELECTORS.FILTER_PRODUCT);
        const lowStockFilter = document.querySelector(STORESTOCK_CONFIG.SELECTORS.FILTER_LOW_STOCK);
        const storeTypeFilter = document.querySelector(STORESTOCK_CONFIG.SELECTORS.FILTER_STORE_TYPE);
        
        if (storeFilter) storeFilter.value = '';
        if (productFilter) productFilter.value = '';
        if (lowStockFilter) lowStockFilter.value = '';
        if (storeTypeFilter) storeTypeFilter.value = '';
        
        this.state.filters = {
            store: '',
            product: '',
            low_stock: '',
            store_type: ''
        };

        this.state.filteredStocks = [...this.state.stocks];
        StoreStockUI.renderList(this.state.filteredStocks);
    }

    openAdjustModal(stockId) {
        const stock = this.state.stocks.find(s => s.id == stockId);
        if (stock) {
            this.state.openAdjustModal(stockId);
            StoreStockUI.updateAdjustModal(stock);
        } else {
            console.error('Stock not found with ID:', stockId);
            StoreStockUtils.showError('Stock record not found');
        }
    }

    closeAdjustModal() {
        this.state.closeAdjustModal();
    }

    openCreateModal(storeId = '', productId = '', quantity = 0) {
        this.state.openCreateModal();
        
        // Pre-fill form if parameters provided
        if (storeId || productId || quantity) {
            const storeSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_STORE);
            const productSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_PRODUCT);
            const quantityInput = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_QUANTITY);
            
            if (storeSelect && storeId) storeSelect.value = storeId;
            if (productSelect && productId) productSelect.value = productId;
            if (quantityInput && quantity) quantityInput.value = quantity;
        }
        
        // Set focus to store select
        setTimeout(() => {
            const storeSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_STORE);
            if (storeSelect) storeSelect.focus();
        }, 100);
    }

    closeCreateModal() {
        this.state.closeCreateModal();
    }

    async submitAdjustment() {
        const actionEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_ACTION);
        const quantityEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_QUANTITY);
        const notesEl = document.querySelector(STORESTOCK_CONFIG.SELECTORS.ADJUST_NOTES);
        
        if (!actionEl || !quantityEl) {
            console.error('Adjustment form elements not found');
            StoreStockUtils.showAdjustError('Form elements missing');
            return;
        }

        const action = actionEl.value;
        const quantity = parseFloat(quantityEl.value);
        const notes = notesEl ? notesEl.value : '';

        // Validate quantity
        if (isNaN(quantity) || quantity < 0) {
            StoreStockUtils.showAdjustError('Please enter a valid quantity (0 or higher)');
            return;
        }

        const stock = this.state.stocks.find(s => s.id == this.state.currentAdjustmentId);
        if (!stock) {
            StoreStockUtils.showAdjustError('Stock record not found');
            return;
        }

        let newQuantity = stock.quantity;
        const data = {};

        switch (action) {
            case 'set':
                newQuantity = quantity;
                data.quantity = newQuantity;
                break;
            case 'add':
                newQuantity = stock.quantity + quantity;
                data.quantity = newQuantity;
                break;
            case 'subtract':
                newQuantity = Math.max(0, stock.quantity - quantity);
                data.quantity = newQuantity;
                break;
            default:
                StoreStockUtils.showAdjustError('Invalid action selected');
                return;
        }

        // Add notes if provided
        if (notes.trim()) {
            data.notes = notes;
        }

        // Validate final quantity
        if (newQuantity < 0) {
            StoreStockUtils.showAdjustError('Quantity cannot be negative');
            return;
        }

        if (!StoreStockUtils.validateAdjustment(data)) {
            return;
        }

        try {
            this.state.setLoading(true, 'adjust');
            
            await this.api.adjustStock(this.state.currentAdjustmentId, data);
            StoreStockUtils.showSuccess(STORESTOCK_CONFIG.MESSAGES.SUCCESS_ADJUST);
            
            // Close modal and reload data
            this.state.closeAdjustModal();
            await this.load();

        } catch (err) {
            console.error('Error adjusting stock:', err);
            StoreStockUtils.showAdjustError(err.message || STORESTOCK_CONFIG.MESSAGES.ERROR_SAVE);
        } finally {
            this.state.setLoading(false, 'adjust');
        }
    }

    async submitCreate() {
        const storeSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_STORE);
        const productSelect = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_PRODUCT);
        const quantityInput = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_QUANTITY);
        const notesTextarea = document.querySelector(STORESTOCK_CONFIG.SELECTORS.CREATE_NOTES);
        
        if (!storeSelect || !productSelect || !quantityInput) {
            console.error('Create form elements not found');
            StoreStockUtils.showCreateError('Form elements missing');
            return;
        }

        const storeId = storeSelect.value;
        const productId = productSelect.value;
        const quantity = parseInt(quantityInput.value);
        const notes = notesTextarea ? notesTextarea.value : '';

        // Validate form
        const data = { store: storeId, product: productId, quantity };
        if (notes.trim()) {
            data.notes = notes;
        }

        if (!StoreStockUtils.validateCreate(data)) {
            return;
        }

        // Check if stock already exists
        try {
            const existing = await this.api.checkExisting(storeId, productId);
            if (existing) {
                if (confirm('Stock already exists for this product at this store. Would you like to adjust the existing stock instead?')) {
                    this.closeCreateModal();
                    this.openAdjustModal(existing.id);
                    return;
                } else {
                    StoreStockUtils.showCreateError(STORESTOCK_CONFIG.MESSAGES.ERROR_DUPLICATE);
                    return;
                }
            }
        } catch (err) {
            console.warn('Could not check existing stock:', err);
        }

        try {
            this.state.setLoading(true, 'create');
            
            await this.api.create(data);
            StoreStockUtils.showSuccess(STORESTOCK_CONFIG.MESSAGES.SUCCESS_CREATE);
            
            // Close modal and reload data
            this.state.closeCreateModal();
            await this.load();

        } catch (err) {
            console.error('Error creating stock:', err);
            StoreStockUtils.showCreateError(err.message || STORESTOCK_CONFIG.MESSAGES.ERROR_CREATE);
        } finally {
            this.state.setLoading(false, 'create');
        }
    }
}

/* =============================
   GLOBAL FUNCTIONS
============================= */
window.openAdjustModal = function(stockId) {
    if (window.storeStockController) {
        window.storeStockController.openAdjustModal(stockId);
    }
};

window.closeAdjustModal = function() {
    if (window.storeStockController) {
        window.storeStockController.closeAdjustModal();
    }
};

window.openCreateModal = function(storeId = '', productId = '', quantity = 0) {
    if (window.storeStockController) {
        window.storeStockController.openCreateModal(storeId, productId, quantity);
    }
};

window.closeCreateModal = function() {
    if (window.storeStockController) {
        window.storeStockController.closeCreateModal();
    }
};

/* =============================
   INITIALIZATION
============================= */
document.addEventListener("DOMContentLoaded", () => {
    console.log('=== Store Stock Module Initializing ===');
    
    // Add CSS for better UI
    const style = document.createElement('style');
    style.textContent = `
        /* Table Styles */
        #stock-list {
            width: 100%;
        }
        
        #stock-list tr {
            transition: background-color 0.2s;
        }
        
        #stock-list tr:hover {
            background-color: #f8f9fa;
        }
        
        .stock-level {
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .stock-low {
            color: #dc3545;
            background-color: #f8d7da;
        }
        
        .stock-adequate {
            color: #28a745;
            background-color: #d4edda;
        }
        
        .stock-status {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.875em;
            font-weight: 500;
        }
        
        .status-low {
            color: #856404;
            background-color: #fff3cd;
        }
        
        .status-ok {
            color: #155724;
            background-color: #d4edda;
        }
        
        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 1.5rem;
            color: #333;
        }
        
        .modal-close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6c757d;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        }
        
        .modal-close-btn:hover {
            background-color: #f8f9fa;
            color: #333;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            padding: 20px;
            border-top: 1px solid #dee2e6;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        /* Form Styles */
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
        }
        
        .form-input, .form-select, .form-textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
        }
        
        .form-input:focus, .form-select:focus, .form-textarea:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }
        
        .form-textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        .search-input {
            width: 100%;
            padding: 8px 12px;
            margin-bottom: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        /* Button Styles */
        .btn-primary, .btn-secondary, .btn-adjust {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background-color: #007bff;
            color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
            background-color: #0056b3;
        }
        
        .btn-primary:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }
        
        .btn-secondary {
            background-color: #6c757d;
            color: white;
        }
        
        .btn-secondary:hover {
            background-color: #545b62;
        }
        
        .btn-adjust {
            background-color: #17a2b8;
            color: white;
            padding: 6px 12px;
            font-size: 14px;
        }
        
        .btn-adjust:hover {
            background-color: #138496;
        }
        
        /* Stats Styles */
        .stats-container {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            flex: 1;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: #007bff;
            margin-bottom: 8px;
        }
        
        .stat-label {
            font-size: 0.875rem;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* Filter Styles */
        .filters-container {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .filter-row {
            display: flex;
            gap: 15px;
            align-items: flex-end;
            flex-wrap: wrap;
        }
        
        .filter-group {
            flex: 1;
            min-width: 200px;
        }
        
        .filter-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
        }
        
        .filter-group select, .filter-group input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 40px 20px;
        }
        
        .empty-state h3 {
            color: #6c757d;
            margin-bottom: 10px;
        }
        
        .empty-state p {
            color: #adb5bd;
        }
        
        /* Actions Header */
        .actions-header {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        #create-stock-btn {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        #create-stock-btn i {
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
    
    // Debug CSRF
    console.log('=== CSRF Debug Info ===');
    console.log('CSRF Cookie:', CSRFTokenManager.getCookie('csrftoken'));
    console.log('CSRF Input:', document.querySelector('input[name="csrfmiddlewaretoken"]')?.value);
    console.log('=== End Debug Info ===');
    
    // Initialize state and controller
    window.storeStockState = new StoreStockState();
    window.storeStockController = new StoreStockController();
    
    // Load initial data
    window.storeStockController.load();
    
    console.log('=== Store Stock Module Initialized ===');
    
    // Error handling
    window.addEventListener('error', (event) => {
        console.error('Global error caught:', event.error);
        StoreStockUtils.showError('An unexpected error occurred. Please refresh the page.');
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        StoreStockUtils.showError('An unexpected error occurred. Please try again.');
    });
});