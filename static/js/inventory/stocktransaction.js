/* ============================================================
    STOCK TRANSACTION MODULE
    Compatible with Django StockTransactionViewSet + StockTransactionSerializer
    Manages stock transactions (IN, OUT, TRANSFER)
============================================================ */

/* =============================
   CONFIGURATION
============================= */
const TRANSACTION_CONFIG = {
    API_ENDPOINTS: {
        TRANSACTIONS: '/inventory/stock-transactions/',
        TRANSACTION_DETAIL: (id) => `/inventory/stock-transactions/${id}/`,
        STORES: '/inventory/stores/',
        PRODUCTS: '/inventory/products/',
        STORE_STOCKS: '/inventory/store-stocks/',
        TRANSACTION_SUMMARY: '/inventory/stock-transactions/summary/',
    },

    SELECTORS: {
        // Modal selectors
        MODAL: '#transaction-modal',
        MODAL_TITLE: '#transaction-modal-title',
        MODAL_ERROR: '#transaction-error',
        MODAL_SUBMIT: '#transaction-submit',
        MODAL_CANCEL: '#transaction-cancel',
        
        // Modal form fields
        TRANSACTION_TYPE: '#transaction-type',
        TRANSACTION_PRODUCT: '#transaction-product',
        TRANSACTION_STORE: '#transaction-store',
        TRANSFER_TO_STORE: '#transfer-to-store',
        TRANSFER_CONTAINER: '#transfer-container',
        TRANSACTION_QUANTITY: '#transaction-quantity',
        TRANSACTION_REFERENCE: '#transaction-reference',
        TRANSACTION_REMARKS: '#transaction-remarks',
        
        // Stock info display
        CURRENT_STOCK: '#current-stock',
        REORDER_LEVEL: '#reorder-level',
        STOCK_STATUS: '#stock-status',
        STOCK_INFO: '#stock-info',
        
        // New transaction button
        NEW_BUTTON: '#new-transaction-btn',
        
        // Filter selectors
        FILTER_TYPE: '#filter-transaction-type',
        FILTER_PRODUCT: '#filter-product',
        FILTER_STORE: '#filter-store',
        FILTER_DATE_FROM: '#filter-date-from',
        FILTER_DATE_TO: '#filter-date-to',
        FILTER_REFERENCE: '#filter-reference',
        CLEAR_FILTERS: '#clear-filters',
        
        // Display selectors
        TRANSACTION_LIST: '#transaction-list',
        TRANSACTION_COUNT: '#transaction-count',
        ERROR_DIV: '#transaction-error',
        
        // Stats selectors
        IN_COUNT: '#in-count',
        IN_QUANTITY: '#in-quantity',
        OUT_COUNT: '#out-count',
        OUT_QUANTITY: '#out-quantity',
        TRANSFER_COUNT: '#transfer-count',
        TRANSFER_QUANTITY: '#transfer-quantity',
        TOTAL_COUNT: '#total-count',
        TOTAL_QUANTITY: '#total-quantity',
        
        // Pagination
        PREV_PAGE: '#prev-page',
        NEXT_PAGE: '#next-page',
        PAGE_INFO: '#page-info',
        CURRENT_PAGE: '#current-page',
        TOTAL_PAGES: '#total-pages',
    },

    MESSAGES: {
        LOADING: 'Loading transactions...',
        SAVING: 'Saving transaction...',
        SUCCESS_CREATE: 'Transaction created successfully',
        SUCCESS_UPDATE: 'Transaction updated successfully',
        SUCCESS_DELETE: 'Transaction deleted successfully',
        ERROR_FETCH: 'Error loading transaction data',
        ERROR_SAVE: 'Error saving transaction',
        ERROR_STOCK: 'Error checking stock levels',
        ERROR_DELETE: 'Error deleting transaction',

        VALIDATION: {
            TYPE_REQUIRED: 'Transaction type is required',
            PRODUCT_REQUIRED: 'Product is required',
            STORE_REQUIRED: 'Store is required',
            QUANTITY_REQUIRED: 'Quantity is required',
            QUANTITY_MIN: 'Quantity must be at least 1',
            DESTINATION_REQUIRED: 'Destination store is required for transfers',
            DESTINATION_SAME_STORE: 'Source and destination stores cannot be the same',
            INSUFFICIENT_STOCK: 'Insufficient stock for this transaction',
        }
    },

    DEFAULT_PAGE_SIZE: 20,
    CURRENT_TRANSACTION_ID: null,
};

/* =============================
   STATE
============================= */
class TransactionState {
    constructor() {
        this.transactions = [];
        this.stores = [];
        this.products = [];
        this.storeStocks = new Map(); // Cache for store stocks
        
        this.filters = {
            transaction_type: '',
            product: '',
            store: '',
            date_from: '',
            date_to: '',
            reference: '',
            page: 1
        };
        
        this.stats = {
            in: { count: 0, quantity: 0 },
            out: { count: 0, quantity: 0 },
            transfer: { count: 0, quantity: 0 },
            total: { count: 0, quantity: 0 }
        };
        
        this.isLoading = false;
        this.totalPages = 1;
        this.totalItems = 0;
        this.csrfToken = this.getCSRFToken();
    }

    getCSRFToken() {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        return csrfToken ? csrfToken.value : '';
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        const btn = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL_SUBMIT);
        if (btn) {
            btn.disabled = isLoading;
            btn.innerHTML = isLoading ? 
                '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...' : 
                'Save Transaction';
        }
    }

    async checkStock(productId, storeId) {
        const cacheKey = `${productId}-${storeId}`;
        
        // Check cache first
        if (this.storeStocks.has(cacheKey)) {
            return this.storeStocks.get(cacheKey);
        }

        try {
            const response = await fetch(
                `${TRANSACTION_CONFIG.API_ENDPOINTS.STORE_STOCKS}?product=${productId}&store=${storeId}`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    const stockInfo = {
                        quantity: data[0].quantity || 0,
                        reorder_level: data[0].product?.reorder_level || 0,
                        is_low_stock: data[0].is_low_stock || false
                    };
                    
                    // Cache the result
                    this.storeStocks.set(cacheKey, stockInfo);
                    return stockInfo;
                }
            }
            
            // Return default if no stock found
            const defaultStock = { quantity: 0, reorder_level: 0, is_low_stock: false };
            this.storeStocks.set(cacheKey, defaultStock);
            return defaultStock;
            
        } catch (error) {
            console.error('Error checking stock:', error);
            return null;
        }
    }

    clearStockCache() {
        this.storeStocks.clear();
    }

    openModal(transactionId = null) {
        TRANSACTION_CONFIG.CURRENT_TRANSACTION_ID = transactionId;
        const modal = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL);
        const title = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL_TITLE);
        
        if (modal) {
            modal.style.display = 'block';
            if (title) {
                title.textContent = transactionId ? 'Edit Transaction' : 'New Transaction';
            }
            
            // Reset form
            this.resetModalForm();
            
            // Load transaction data if editing
            if (transactionId) {
                this.loadTransactionForEdit(transactionId);
            }
        }
    }

    closeModal() {
        const modal = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL);
        if (modal) {
            modal.style.display = 'none';
        }
        this.resetModalForm();
        TransactionUtils.hideModalError();
        TRANSACTION_CONFIG.CURRENT_TRANSACTION_ID = null;
    }

    resetModalForm() {
        const formSelectors = [
            TRANSACTION_CONFIG.SELECTORS.TRANSACTION_TYPE,
            TRANSACTION_CONFIG.SELECTORS.TRANSACTION_PRODUCT,
            TRANSACTION_CONFIG.SELECTORS.TRANSACTION_STORE,
            TRANSACTION_CONFIG.SELECTORS.TRANSFER_TO_STORE,
            TRANSACTION_CONFIG.SELECTORS.TRANSACTION_QUANTITY,
            TRANSACTION_CONFIG.SELECTORS.TRANSACTION_REFERENCE,
            TRANSACTION_CONFIG.SELECTORS.TRANSACTION_REMARKS
        ];

        formSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                if (element.tagName === 'SELECT') {
                    element.value = '';
                } else {
                    element.value = selector === TRANSACTION_CONFIG.SELECTORS.TRANSACTION_QUANTITY ? '1' : '';
                }
            }
        });

        // Hide stock info
        const stockInfo = document.querySelector(TRANSACTION_CONFIG.SELECTORS.STOCK_INFO);
        if (stockInfo) {
            stockInfo.style.display = 'none';
        }

        // Hide transfer container
        const transferContainer = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSFER_CONTAINER);
        if (transferContainer) {
            transferContainer.style.display = 'none';
        }
    }

    async loadTransactionForEdit(transactionId) {
        try {
            this.setLoading(true);
            
            const response = await fetch(`${TRANSACTION_CONFIG.API_ENDPOINTS.TRANSACTION_DETAIL(transactionId)}`);
            if (!response.ok) throw new Error('Failed to load transaction');
            
            const transaction = await response.json();
            
            // Populate form fields
            document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_TYPE).value = transaction.transaction_type;
            document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_PRODUCT).value = transaction.product;
            document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_STORE).value = transaction.store;
            document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_QUANTITY).value = transaction.quantity;
            document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_REFERENCE).value = transaction.reference || '';
            document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_REMARKS).value = transaction.remarks || '';
            
            if (transaction.transaction_type === 'TRANSFER') {
                document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSFER_TO_STORE).value = transaction.transfer_to_store;
                const transferContainer = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSFER_CONTAINER);
                if (transferContainer) {
                    transferContainer.style.display = 'block';
                }
            }
            
            // Update stock info
            await window.transactionController.updateStockInfo();
            
        } catch (error) {
            TransactionUtils.showModalError('Failed to load transaction data');
            console.error('Error loading transaction:', error);
            this.closeModal();
        } finally {
            this.setLoading(false);
        }
    }
}

/* =============================
   UTILITIES
============================= */
class TransactionUtils {
    static showError(message) {
        const div = document.querySelector(TRANSACTION_CONFIG.SELECTORS.ERROR_DIV);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
            setTimeout(() => this.hideError(), 5000);
        }
    }

    static hideError() {
        const div = document.querySelector(TRANSACTION_CONFIG.SELECTORS.ERROR_DIV);
        if (div) {
            div.style.display = 'none';
        }
    }

    static showModalError(message) {
        const div = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL_ERROR);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
        }
    }

    static hideModalError() {
        const div = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL_ERROR);
        if (div) {
            div.style.display = 'none';
        }
    }

    static showSuccess(message) {
        // Using Toastr if available, otherwise custom alert
        if (typeof toastr !== 'undefined') {
            toastr.success(message);
        } else {
            // Create custom success notification
            const notification = document.createElement('div');
            notification.className = 'alert alert-success alert-dismissible fade show';
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999;';
            notification.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            document.body.appendChild(notification);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        }
    }

    static showWarning(message) {
        if (typeof toastr !== 'undefined') {
            toastr.warning(message);
        } else {
            alert(message);
        }
    }

    static validateTransaction(data, currentStock = null) {
        this.hideModalError();

        // Basic validation
        if (!data.transaction_type) {
            this.showModalError(TRANSACTION_CONFIG.MESSAGES.VALIDATION.TYPE_REQUIRED);
            return false;
        }

        if (!data.product) {
            this.showModalError(TRANSACTION_CONFIG.MESSAGES.VALIDATION.PRODUCT_REQUIRED);
            return false;
        }

        if (!data.store) {
            this.showModalError(TRANSACTION_CONFIG.MESSAGES.VALIDATION.STORE_REQUIRED);
            return false;
        }

        if (!data.quantity || data.quantity < 1) {
            this.showModalError(TRANSACTION_CONFIG.MESSAGES.VALIDATION.QUANTITY_MIN);
            return false;
        }

        // Transfer-specific validation
        if (data.transaction_type === 'TRANSFER') {
            if (!data.transfer_to_store) {
                this.showModalError(TRANSACTION_CONFIG.MESSAGES.VALIDATION.DESTINATION_REQUIRED);
                return false;
            }
            
            if (data.store == data.transfer_to_store) {
                this.showModalError(TRANSACTION_CONFIG.MESSAGES.VALIDATION.DESTINATION_SAME_STORE);
                return false;
            }
        }

        // Stock validation for OUT and TRANSFER
        if ((data.transaction_type === 'OUT' || data.transaction_type === 'TRANSFER') && currentStock) {
            if (data.quantity > currentStock.quantity) {
                this.showModalError(TRANSACTION_CONFIG.MESSAGES.VALIDATION.INSUFFICIENT_STOCK);
                return false;
            }
        }

        return true;
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static formatType(type) {
        const types = {
            'IN': { text: 'Stock In', class: 'badge-success' },
            'OUT': { text: 'Stock Out', class: 'badge-danger' },
            'TRANSFER': { text: 'Transfer', class: 'badge-info' }
        };
        return types[type] || { text: type, class: 'badge-secondary' };
    }

    static escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }
}

/* =============================
   API SERVICE
============================= */
class TransactionAPI {
    constructor() {
        this.baseHeaders = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    async list(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = `${TRANSACTION_CONFIG.API_ENDPOINTS.TRANSACTIONS}${queryParams ? `?${queryParams}` : ''}`;
        
        const res = await fetch(url);
        if (!res.ok) {
            const errorText = await res.text();
            console.error('API Error:', errorText);
            throw new Error(TRANSACTION_CONFIG.MESSAGES.ERROR_FETCH);
        }
        return await res.json();
    }

    async get(id) {
        const res = await fetch(TRANSACTION_CONFIG.API_ENDPOINTS.TRANSACTION_DETAIL(id));
        if (!res.ok) throw new Error('Failed to fetch transaction');
        return await res.json();
    }

    async stores() {
        const res = await fetch(TRANSACTION_CONFIG.API_ENDPOINTS.STORES);
        return await res.json();
    }

    async products() {
        const res = await fetch(TRANSACTION_CONFIG.API_ENDPOINTS.PRODUCTS);
        return await res.json();
    }

    async create(data) {
        const csrfToken = window.transactionState.csrfToken;
        console.log('Creating transaction with data:', data);
        console.log('CSRF Token:', csrfToken ? 'Present' : 'Missing');
        
        const res = await fetch(TRANSACTION_CONFIG.API_ENDPOINTS.TRANSACTIONS, {
            method: 'POST',
            headers: {
                ...this.baseHeaders,
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(data)
        });

        const responseText = await res.text();
        console.log('Create response status:', res.status);
        console.log('Create response text:', responseText);

        if (!res.ok) {
            let errorMessage = TRANSACTION_CONFIG.MESSAGES.ERROR_SAVE;
            try {
                const json = JSON.parse(responseText);
                errorMessage = json.detail || json.error || Object.values(json).join(', ') || errorMessage;
            } catch (e) {
                errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        try {
            return JSON.parse(responseText);
        } catch (e) {
            return { success: true };
        }
    }

    async update(id, data) {
        const csrfToken = window.transactionState.csrfToken;
        console.log('Updating transaction:', id, data);
        
        const res = await fetch(TRANSACTION_CONFIG.API_ENDPOINTS.TRANSACTION_DETAIL(id), {
            method: 'PUT',
            headers: {
                ...this.baseHeaders,
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(data)
        });

        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.detail || json.error || TRANSACTION_CONFIG.MESSAGES.ERROR_SAVE);
        }
        return json;
    }

    async delete(id) {
        const csrfToken = window.transactionState.csrfToken;
        const res = await fetch(TRANSACTION_CONFIG.API_ENDPOINTS.TRANSACTION_DETAIL(id), {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!res.ok) {
            throw new Error(TRANSACTION_CONFIG.MESSAGES.ERROR_DELETE);
        }
        
        return res.status === 204;
    }

    async getSummary(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = `${TRANSACTION_CONFIG.API_ENDPOINTS.TRANSACTION_SUMMARY}${queryParams ? `?${queryParams}` : ''}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed loading transaction summary");
        return await res.json();
    }
}

/* =============================
   UI RENDERER
============================= */
class TransactionUI {
    static renderStores(stores) {
        const storeSelectors = [
            TRANSACTION_CONFIG.SELECTORS.TRANSACTION_STORE,
            TRANSACTION_CONFIG.SELECTORS.TRANSFER_TO_STORE,
            TRANSACTION_CONFIG.SELECTORS.FILTER_STORE
        ];

        storeSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                // Save current value
                const currentValue = element.value;
                element.innerHTML = '<option value="">Select Store</option>';
                
                stores.forEach(store => {
                    const option = document.createElement('option');
                    option.value = store.id;
                    option.textContent = `${store.name} (${store.store_type || 'Store'})`;
                    if (store.is_warehouse) {
                        option.dataset.warehouse = 'true';
                    }
                    element.appendChild(option);
                });
                
                // Restore value if it exists
                if (currentValue) {
                    element.value = currentValue;
                }
            }
        });
    }

    static renderProducts(products) {
        const productSelectors = [
            TRANSACTION_CONFIG.SELECTORS.TRANSACTION_PRODUCT,
            TRANSACTION_CONFIG.SELECTORS.FILTER_PRODUCT
        ];

        productSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                // Save current value
                const currentValue = element.value;
                element.innerHTML = '<option value="">Select Product</option>';
                
                products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.name} (${product.sku || 'No SKU'})`;
                    option.dataset.category = product.category || '';
                    element.appendChild(option);
                });
                
                // Restore value if it exists
                if (currentValue) {
                    element.value = currentValue;
                }
            }
        });
    }

    static renderStats(stats) {
        // Update IN stats
        const inCount = document.querySelector(TRANSACTION_CONFIG.SELECTORS.IN_COUNT);
        const inQuantity = document.querySelector(TRANSACTION_CONFIG.SELECTORS.IN_QUANTITY);
        if (inCount) inCount.textContent = TransactionUtils.formatNumber(stats.in.count);
        if (inQuantity) inQuantity.textContent = `${TransactionUtils.formatNumber(stats.in.quantity)} units`;
        
        // Update OUT stats
        const outCount = document.querySelector(TRANSACTION_CONFIG.SELECTORS.OUT_COUNT);
        const outQuantity = document.querySelector(TRANSACTION_CONFIG.SELECTORS.OUT_QUANTITY);
        if (outCount) outCount.textContent = TransactionUtils.formatNumber(stats.out.count);
        if (outQuantity) outQuantity.textContent = `${TransactionUtils.formatNumber(stats.out.quantity)} units`;
        
        // Update TRANSFER stats
        const transferCount = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSFER_COUNT);
        const transferQuantity = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSFER_QUANTITY);
        if (transferCount) transferCount.textContent = TransactionUtils.formatNumber(stats.transfer.count);
        if (transferQuantity) transferQuantity.textContent = `${TransactionUtils.formatNumber(stats.transfer.quantity)} units`;
        
        // Update TOTAL stats
        const totalCount = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TOTAL_COUNT);
        const totalQuantity = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TOTAL_QUANTITY);
        if (totalCount) totalCount.textContent = TransactionUtils.formatNumber(stats.total.count);
        if (totalQuantity) totalQuantity.textContent = `${TransactionUtils.formatNumber(stats.total.quantity)} units`;
    }

    static renderList(transactions, pagination) {
        const tbody = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_LIST);
        if (!tbody) {
            console.error('Transaction list tbody not found:', TRANSACTION_CONFIG.SELECTORS.TRANSACTION_LIST);
            return;
        }
        
        tbody.innerHTML = "";

        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-5">
                        <div class="empty-state">
                            <i class="fas fa-exchange-alt fa-3x text-muted mb-3"></i>
                            <h4>No transactions found</h4>
                            <p class="text-muted">${pagination.count > 0 ? 'Try adjusting your filters' : 'Create your first transaction'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            const typeInfo = TransactionUtils.formatType(transaction.transaction_type);
            
            row.innerHTML = `
                <td>${TransactionUtils.formatDate(transaction.timestamp)}</td>
                <td>
                    <span class="badge ${typeInfo.class}">
                        ${typeInfo.text}
                    </span>
                </td>
                <td>
                    <div class="fw-bold">${TransactionUtils.escapeHtml(transaction.product_name)}</div>
                    <small class="text-muted">${TransactionUtils.escapeHtml(transaction.product_sku)}</small>
                </td>
                <td>${TransactionUtils.escapeHtml(transaction.store_name)}</td>
                <td>
                    ${transaction.transaction_type === 'TRANSFER' ? 
                        `<i class="fas fa-arrow-right text-info me-1"></i> ${TransactionUtils.escapeHtml(transaction.transfer_to_store_name || '')}` : 
                        '—'
                    }
                </td>
                <td class="text-end fw-bold">${TransactionUtils.formatNumber(transaction.quantity)}</td>
                <td>${TransactionUtils.escapeHtml(transaction.reference || '—')}</td>
                <td>${TransactionUtils.escapeHtml(transaction.performed_by_name || 'System')}</td>
                <td>${TransactionUtils.escapeHtml(transaction.remarks || '')}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-transaction" 
                                data-id="${transaction.id}"
                                title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-transaction" 
                                data-id="${transaction.id}"
                                title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });

        // Update pagination info
        const pageInfo = document.querySelector(TRANSACTION_CONFIG.SELECTORS.PAGE_INFO);
        if (pageInfo) {
            pageInfo.innerHTML = `
                Showing <strong>${((pagination.page - 1) * TRANSACTION_CONFIG.DEFAULT_PAGE_SIZE) + 1}</strong> 
                to <strong>${Math.min(pagination.page * TRANSACTION_CONFIG.DEFAULT_PAGE_SIZE, pagination.count)}</strong> 
                of <strong>${TransactionUtils.formatNumber(pagination.count)}</strong> transactions
            `;
        }

        // Update pagination controls
        const prevBtn = document.querySelector(TRANSACTION_CONFIG.SELECTORS.PREV_PAGE);
        const nextBtn = document.querySelector(TRANSACTION_CONFIG.SELECTORS.NEXT_PAGE);
        const currentPage = document.querySelector(TRANSACTION_CONFIG.SELECTORS.CURRENT_PAGE);
        const totalPages = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TOTAL_PAGES);
        
        if (prevBtn) prevBtn.disabled = pagination.page <= 1;
        if (nextBtn) nextBtn.disabled = pagination.page >= pagination.total_pages;
        if (currentPage) currentPage.textContent = pagination.page;
        if (totalPages) totalPages.textContent = pagination.total_pages;
    }

    static updateStockInfo(stockInfo) {
        const stockInfoDiv = document.querySelector(TRANSACTION_CONFIG.SELECTORS.STOCK_INFO);
        const currentStock = document.querySelector(TRANSACTION_CONFIG.SELECTORS.CURRENT_STOCK);
        const reorderLevel = document.querySelector(TRANSACTION_CONFIG.SELECTORS.REORDER_LEVEL);
        const stockStatus = document.querySelector(TRANSACTION_CONFIG.SELECTORS.STOCK_STATUS);
        
        if (!stockInfo) {
            if (stockInfoDiv) stockInfoDiv.style.display = 'none';
            return;
        }
        
        if (stockInfoDiv) stockInfoDiv.style.display = 'block';
        if (currentStock) currentStock.textContent = TransactionUtils.formatNumber(stockInfo.quantity);
        if (reorderLevel) reorderLevel.textContent = TransactionUtils.formatNumber(stockInfo.reorder_level);
        
        if (stockStatus) {
            if (stockInfo.quantity <= stockInfo.reorder_level) {
                stockStatus.textContent = 'Low Stock';
                stockStatus.className = 'badge badge-danger';
            } else if (stockInfo.quantity <= stockInfo.reorder_level * 2) {
                stockStatus.textContent = 'Warning';
                stockStatus.className = 'badge badge-warning';
            } else {
                stockStatus.textContent = 'Adequate';
                stockStatus.className = 'badge badge-success';
            }
        }
    }

    static showLoading() {
        const tbody = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_LIST);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-5">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2">${TRANSACTION_CONFIG.MESSAGES.LOADING}</p>
                    </td>
                </tr>
            `;
        }
    }
}

/* =============================
   MAIN CONTROLLER
============================= */
class TransactionController {
    constructor() {
        this.state = window.transactionState;
        this.api = new TransactionAPI();
        this.initEvents();
        this.setupEventDelegation(); // CRITICAL: Setup event delegation
    }

    initEvents() {
        console.log('Initializing transaction events...');
        
        // New transaction button - FIXED
        const newBtn = document.querySelector(TRANSACTION_CONFIG.SELECTORS.NEW_BUTTON);
        if (newBtn) {
            console.log('New transaction button found');
            // Remove and re-add to prevent duplicate listeners
            const newClone = newBtn.cloneNode(true);
            newBtn.parentNode.replaceChild(newClone, newBtn);
            
            // Add fresh listener
            document.querySelector(TRANSACTION_CONFIG.SELECTORS.NEW_BUTTON)
                .addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('New transaction button clicked');
                    this.openModal();
                });
        } else {
            console.error('New transaction button not found:', TRANSACTION_CONFIG.SELECTORS.NEW_BUTTON);
        }

        // Modal buttons
        const modalSubmit = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL_SUBMIT);
        const modalCancel = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL_CANCEL);
        
        if (modalSubmit) {
            modalSubmit.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Modal submit clicked');
                this.submitTransaction();
            });
        }
        
        if (modalCancel) {
            modalCancel.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Modal cancel clicked');
                this.state.closeModal();
            });
        }

        // Transaction type change event
        const typeSelect = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_TYPE);
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                console.log('Transaction type changed:', e.target.value);
                this.handleTransactionTypeChange(e.target.value);
            });
        }

        // Product and store change events for stock info
        const productSelect = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_PRODUCT);
        const storeSelect = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_STORE);
        
        if (productSelect) {
            productSelect.addEventListener('change', () => {
                console.log('Product changed');
                this.updateStockInfo();
            });
        }
        
        if (storeSelect) {
            storeSelect.addEventListener('change', () => {
                console.log('Store changed');
                this.updateStockInfo();
            });
        }

        // Filter events
        const filterElements = [
            TRANSACTION_CONFIG.SELECTORS.FILTER_TYPE,
            TRANSACTION_CONFIG.SELECTORS.FILTER_PRODUCT,
            TRANSACTION_CONFIG.SELECTORS.FILTER_STORE,
            TRANSACTION_CONFIG.SELECTORS.FILTER_DATE_FROM,
            TRANSACTION_CONFIG.SELECTORS.FILTER_DATE_TO
        ];

        filterElements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener('change', () => {
                    console.log('Filter changed:', selector);
                    this.applyFilters();
                });
            }
        });

        // Reference filter with debounce
        const referenceFilter = document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_REFERENCE);
        if (referenceFilter) {
            let debounceTimer;
            referenceFilter.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.state.filters.reference = e.target.value;
                    this.applyFilters();
                }, 500);
            });
        }

        // Clear filters
        const clearBtn = document.querySelector(TRANSACTION_CONFIG.SELECTORS.CLEAR_FILTERS);
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Clear filters clicked');
                this.clearFilters();
            });
        }

        // Pagination
        const prevBtn = document.querySelector(TRANSACTION_CONFIG.SELECTORS.PREV_PAGE);
        const nextBtn = document.querySelector(TRANSACTION_CONFIG.SELECTORS.NEXT_PAGE);
        
        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToPage(this.state.filters.page - 1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToPage(this.state.filters.page + 1);
            });
        }

        // Close modal when clicking outside
        const modal = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.state.closeModal();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector(TRANSACTION_CONFIG.SELECTORS.MODAL);
                if (modal && modal.style.display === 'block') {
                    this.state.closeModal();
                }
            }
        });

        console.log('All events initialized');
    }

    async load() {
        try {
            console.log('Loading transaction data...');
            TransactionUI.showLoading();
            this.state.isLoading = true;

            // Load stores and products
            console.log('Loading stores and products...');
            const [stores, products] = await Promise.all([
                this.api.stores(),
                this.api.products()
            ]);

            console.log('Stores loaded:', stores.length);
            console.log('Products loaded:', products.length);
            
            this.state.stores = stores;
            this.state.products = products;
            
            TransactionUI.renderStores(stores);
            TransactionUI.renderProducts(products);

            // Load transactions with current filters
            await this.loadTransactions();
            
            // Load summary stats
            await this.loadSummary();

            console.log('Transaction data loaded successfully');

        } catch (err) {
            console.error('Error loading transactions:', err);
            TransactionUtils.showError(TRANSACTION_CONFIG.MESSAGES.ERROR_FETCH);
        } finally {
            this.state.isLoading = false;
        }
    }

    async loadTransactions() {
        try {
            console.log('Loading transactions with filters:', this.state.filters);
            
            // Build query params
            const params = {
                page: this.state.filters.page,
                page_size: TRANSACTION_CONFIG.DEFAULT_PAGE_SIZE
            };

            // Add filters
            if (this.state.filters.transaction_type) {
                params.transaction_type = this.state.filters.transaction_type;
            }
            if (this.state.filters.product) {
                params.product = this.state.filters.product;
            }
            if (this.state.filters.store) {
                params.store = this.state.filters.store;
            }
            if (this.state.filters.date_from) {
                params.date_from = this.state.filters.date_from;
            }
            if (this.state.filters.date_to) {
                params.date_to = this.state.filters.date_to;
            }
            if (this.state.filters.reference) {
                params.reference = this.state.filters.reference;
            }

            console.log('API params:', params);
            const response = await this.api.list(params);
            
            // Handle both paginated and non-paginated responses
            if (response.results !== undefined) {
                // DRF paginated response
                this.state.transactions = response.results;
                this.state.totalItems = response.count;
            } else {
                // Non-paginated response
                this.state.transactions = Array.isArray(response) ? response : [];
                this.state.totalItems = this.state.transactions.length;
            }
            
            this.state.totalPages = Math.ceil(this.state.totalItems / TRANSACTION_CONFIG.DEFAULT_PAGE_SIZE);
            
            console.log('Transactions loaded:', this.state.transactions.length);
            console.log('Total items:', this.state.totalItems);
            console.log('Total pages:', this.state.totalPages);

            // Render with pagination info
            const pagination = {
                page: this.state.filters.page,
                total_pages: this.state.totalPages,
                count: this.state.totalItems
            };
            
            TransactionUI.renderList(this.state.transactions, pagination);

        } catch (error) {
            console.error('Error loading transactions:', error);
            throw error;
        }
    }

    async loadSummary() {
        try {
            console.log('Loading summary...');
            const params = {};
            
            // Add date filters to summary
            if (this.state.filters.date_from) {
                params.date_from = this.state.filters.date_from;
            }
            if (this.state.filters.date_to) {
                params.date_to = this.state.filters.date_to;
            }

            const summary = await this.api.getSummary(params);
            console.log('Summary loaded:', summary);
            this.state.stats = summary;
            TransactionUI.renderStats(summary);
            
        } catch (error) {
            console.error('Error loading summary:', error);
        }
    }

    async updateStockInfo() {
        const productId = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_PRODUCT).value;
        const storeId = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_STORE).value;

        if (productId && storeId) {
            console.log('Updating stock info for product:', productId, 'store:', storeId);
            const stockInfo = await this.state.checkStock(productId, storeId);
            TransactionUI.updateStockInfo(stockInfo);
        } else {
            TransactionUI.updateStockInfo(null);
        }
    }

    handleTransactionTypeChange(type) {
        console.log('Handling transaction type change:', type);
        const transferContainer = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSFER_CONTAINER);
        if (transferContainer) {
            if (type === 'TRANSFER') {
                transferContainer.style.display = 'block';
            } else {
                transferContainer.style.display = 'none';
            }
        }
    }

    applyFilters() {
        console.log('Applying filters...');
        
        // Update state with current filter values
        this.state.filters.transaction_type = document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_TYPE).value;
        this.state.filters.product = document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_PRODUCT).value;
        this.state.filters.store = document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_STORE).value;
        this.state.filters.date_from = document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_DATE_FROM).value;
        this.state.filters.date_to = document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_DATE_TO).value;
        // Reference filter is already updated in event listener

        console.log('Updated filters:', this.state.filters);

        // Reset to page 1 when filters change
        this.state.filters.page = 1;
        
        // Clear stock cache
        this.state.clearStockCache();
        
        // Reload data
        this.loadTransactions();
        this.loadSummary();
    }

    clearFilters() {
        console.log('Clearing filters...');
        
        // Reset all filter inputs
        document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_TYPE).value = '';
        document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_PRODUCT).value = '';
        document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_STORE).value = '';
        document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_DATE_FROM).value = '';
        document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_DATE_TO).value = '';
        document.querySelector(TRANSACTION_CONFIG.SELECTORS.FILTER_REFERENCE).value = '';

        // Reset filter state
        this.state.filters = {
            transaction_type: '',
            product: '',
            store: '',
            date_from: '',
            date_to: '',
            reference: '',
            page: 1
        };

        console.log('Filters cleared');

        // Clear stock cache
        this.state.clearStockCache();
        
        // Reload data
        this.loadTransactions();
        this.loadSummary();
    }

    goToPage(page) {
        console.log('Going to page:', page);
        if (page < 1 || page > this.state.totalPages) return;
        
        this.state.filters.page = page;
        this.loadTransactions();
    }

    openModal(transactionId = null) {
        console.log('Opening modal, transactionId:', transactionId);
        this.state.openModal(transactionId);
    }

    async submitTransaction() {
        console.log('Submitting transaction...');
        
        // Collect form data
        const data = {
            transaction_type: document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_TYPE).value,
            product: document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_PRODUCT).value,
            store: document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_STORE).value,
            quantity: parseInt(document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_QUANTITY).value),
            reference: document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_REFERENCE).value,
            remarks: document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSACTION_REMARKS).value
        };

        console.log('Form data collected:', data);

        // Add transfer destination if applicable
        if (data.transaction_type === 'TRANSFER') {
            data.transfer_to_store = document.querySelector(TRANSACTION_CONFIG.SELECTORS.TRANSFER_TO_STORE).value;
            console.log('Transfer destination:', data.transfer_to_store);
        }

        // Check current stock for validation
        const currentStock = await this.state.checkStock(data.product, data.store);
        console.log('Current stock for validation:', currentStock);

        // Validate
        if (!TransactionUtils.validateTransaction(data, currentStock)) {
            console.log('Validation failed');
            return;
        }

        try {
            this.state.setLoading(true);
            
            let result;
            const transactionId = TRANSACTION_CONFIG.CURRENT_TRANSACTION_ID;
            
            console.log('Transaction ID for save:', transactionId);
            
            if (transactionId) {
                // Update existing transaction
                console.log('Updating existing transaction:', transactionId);
                result = await this.api.update(transactionId, data);
                console.log('Update result:', result);
                TransactionUtils.showSuccess(TRANSACTION_CONFIG.MESSAGES.SUCCESS_UPDATE);
            } else {
                // Create new transaction
                console.log('Creating new transaction');
                result = await this.api.create(data);
                console.log('Create result:', result);
                TransactionUtils.showSuccess(TRANSACTION_CONFIG.MESSAGES.SUCCESS_CREATE);
            }
            
            // Close modal and reload data
            console.log('Closing modal and reloading data');
            this.state.closeModal();
            
            // Clear stock cache as stock levels have changed
            this.state.clearStockCache();
            
            // Reload transactions and summary
            await Promise.all([
                this.loadTransactions(),
                this.loadSummary()
            ]);

            console.log('Transaction saved successfully');

        } catch (err) {
            console.error('Error in submitTransaction:', err);
            TransactionUtils.showModalError(err.message);
        } finally {
            this.state.setLoading(false);
        }
    }

    // Event delegation setup for dynamically created buttons
    setupEventDelegation() {
        console.log('Setting up event delegation...');
        
        document.addEventListener('click', async (e) => {
            // Edit button
            if (e.target.closest('.edit-transaction') || 
                (e.target.classList.contains('fa-edit') && e.target.closest('button'))) {
                const button = e.target.closest('.edit-transaction') || 
                              e.target.closest('button');
                const transactionId = button.dataset.id;
                console.log('Edit button clicked for ID:', transactionId);
                e.preventDefault();
                e.stopPropagation();
                this.openModal(transactionId);
            }
            
            // Delete button
            if (e.target.closest('.delete-transaction') || 
                (e.target.classList.contains('fa-trash') && e.target.closest('button'))) {
                const button = e.target.closest('.delete-transaction') || 
                              e.target.closest('button');
                const transactionId = button.dataset.id;
                console.log('Delete button clicked for ID:', transactionId);
                e.preventDefault();
                e.stopPropagation();
                
                if (confirm('Are you sure you want to delete this transaction?')) {
                    await this.deleteTransaction(transactionId);
                }
            }
        });
    }

    async deleteTransaction(transactionId) {
        try {
            this.state.setLoading(true);
            
            console.log('Deleting transaction:', transactionId);
            await this.api.delete(transactionId);
            TransactionUtils.showSuccess(TRANSACTION_CONFIG.MESSAGES.SUCCESS_DELETE);
            
            // Clear stock cache
            this.state.clearStockCache();
            
            // Reload data
            await Promise.all([
                this.loadTransactions(),
                this.loadSummary()
            ]);
            
        } catch (err) {
            TransactionUtils.showError(err.message);
            console.error('Error deleting transaction:', err);
        } finally {
            this.state.setLoading(false);
        }
    }
}

/* =============================
   INITIALIZATION
============================= */
document.addEventListener("DOMContentLoaded", () => {
    console.log('DOM loaded, initializing transaction module...');
    
    try {
        // Initialize state
        window.transactionState = new TransactionState();
        console.log('TransactionState initialized');
        
        // Initialize controller
        window.transactionController = new TransactionController();
        console.log('TransactionController initialized');
        
        // Initial load
        console.log('Loading initial data...');
        window.transactionController.load();
        
        // Make controller globally available for debugging
        window.TransactionController = TransactionController;
        
        console.log('Transaction module initialized successfully');
        
    } catch (error) {
        console.error('Error initializing transaction module:', error);
        TransactionUtils.showError('Failed to initialize transaction module. Please refresh the page.');
    }
});

// Global helper function for manual testing
window.testTransactionModule = function() {
    console.log('=== Testing Transaction Module ===');
    console.log('State:', window.transactionState);
    console.log('Controller:', window.transactionController);
    console.log('CSRF Token:', window.transactionState?.csrfToken ? 'Present' : 'Missing');
    
    // Test if new button works
    const newBtn = document.querySelector('#new-transaction-btn');
    if (newBtn) {
        console.log('New button found, clicking...');
        newBtn.click();
    } else {
        console.error('New button not found');
    }
};