/* ============================================================
   SIMPLIFIED STOCK TRANSFER MODULE (No Approval)
============================================================ */

const TRANSFER_CONFIG = {
    API_ENDPOINTS: {
        TRANSFERS: '/inventory/stock-transfers/',
        TRANSFER_DETAIL: (id) => `/inventory/stock-transfers/${id}/`,
        STORES: '/inventory/stores/',
        PRODUCTS: '/inventory/products/',
        STORE_STOCKS: '/inventory/store-stocks/',
        RECENT_TRANSFERS: '/inventory/stock-transfers/recent/',
        SUMMARY: '/inventory/stock-transfers/summary/',
    },

    SELECTORS: {
        TRANSFER_MODAL: '#transfer-modal',
        MODAL_TITLE: '#transfer-modal-title',
        FORM_ERROR: '#transfer-form-error',
        SUBMIT_BUTTON: '#transfer-submit',
        CANCEL_BUTTON: '#transfer-cancel',
        TRANSFER_PRODUCT: '#transfer-product',
        TRANSFER_FROM_STORE: '#transfer-from-store',
        TRANSFER_TO_STORE: '#transfer-to-store',
        TRANSFER_QUANTITY: '#transfer-quantity',
        TRANSFER_NOTES: '#transfer-notes',
        SOURCE_CURRENT_STOCK: '#source-current-stock',
        SOURCE_AFTER_TRANSFER: '#source-after-transfer',
        DESTINATION_CURRENT_STOCK: '#destination-current-stock',
        DESTINATION_AFTER_TRANSFER: '#destination-after-transfer',
        VALIDATION_MESSAGE: '#transfer-validation',
        NEW_BUTTON: '#new-transfer-btn',
        FILTER_PRODUCT: '#filter-product',
        FILTER_FROM_STORE: '#filter-from-store',
        FILTER_TO_STORE: '#filter-to-store',
        FILTER_DATE_FROM: '#filter-date-from',
        FILTER_DATE_TO: '#filter-date-to',
        CLEAR_FILTERS: '#clear-filters',
        APPLY_FILTERS: '#apply-filters',
        TRANSFER_LIST: '#transfer-list',
        ERROR_DIV: '#transfer-error',
        TOTAL_TRANSFERS: '#total-transfers',
        TOTAL_QUANTITY: '#total-quantity',
        TODAY_COUNT: '#today-count',
        PREV_PAGE: '#prev-page',
        NEXT_PAGE: '#next-page',
        PAGE_INFO: '#page-info',
    },

    MESSAGES: {
        LOADING: 'Loading transfers...',
        SAVING: 'Processing transfer...',
        SUCCESS_CREATE: 'Transfer completed successfully!',
        ERROR_FETCH: 'Error loading transfer data',
        ERROR_SAVE: 'Error creating transfer',
        VALIDATION: {
            PRODUCT_REQUIRED: 'Product is required',
            FROM_STORE_REQUIRED: 'Source store is required',
            TO_STORE_REQUIRED: 'Destination store is required',
            QUANTITY_REQUIRED: 'Quantity is required',
            QUANTITY_MIN: 'Quantity must be at least 1',
            SAME_STORE: 'Source and destination cannot be the same store',
            INSUFFICIENT_STOCK: 'Insufficient stock in source store',
        }
    },

    DEFAULT_PAGE_SIZE: 20
};

class TransferState {
    constructor() {
        this.transfers = [];
        this.stores = [];
        this.products = [];
        this.filters = {
            product: '',
            from_store: '',
            to_store: '',
            date_from: '',
            date_to: ''
        };
        this.stats = { total_transfers: 0, total_quantity: 0, today: 0 };
        this.isLoading = false;
        this.csrfToken = this.getCSRFToken();
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.editId = null;
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }
}

class TransferManager {
    constructor() {
        this.state = new TransferState();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadData();
    }

    bindEvents() {
        // New transfer button
        document.querySelector(TRANSFER_CONFIG.SELECTORS.NEW_BUTTON)?.addEventListener('click', () => this.openModal());
        
        // Transfer modal buttons
        document.querySelector(TRANSFER_CONFIG.SELECTORS.SUBMIT_BUTTON)?.addEventListener('click', () => this.submitTransfer());
        document.querySelector(TRANSFER_CONFIG.SELECTORS.CANCEL_BUTTON)?.addEventListener('click', () => this.closeModal());
        
        // Stock info updates
        const productSelect = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_PRODUCT);
        const fromStoreSelect = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_FROM_STORE);
        const toStoreSelect = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_TO_STORE);
        const quantityInput = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_QUANTITY);
        
        [productSelect, fromStoreSelect, toStoreSelect, quantityInput].forEach(el => {
            if (el) {
                el.addEventListener('change', () => this.updateStockInfo());
                el.addEventListener('input', () => this.updateStockInfo());
            }
        });
        
        // Filters
        document.querySelector(TRANSFER_CONFIG.SELECTORS.APPLY_FILTERS)?.addEventListener('click', () => this.applyFilters());
        document.querySelector(TRANSFER_CONFIG.SELECTORS.CLEAR_FILTERS)?.addEventListener('click', () => this.clearFilters());
        
        // Pagination
        document.querySelector(TRANSFER_CONFIG.SELECTORS.PREV_PAGE)?.addEventListener('click', () => this.prevPage());
        document.querySelector(TRANSFER_CONFIG.SELECTORS.NEXT_PAGE)?.addEventListener('click', () => this.nextPage());
        
        // Close modal on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeModal();
            }
        });
    }

    async loadData() {
        try {
            this.setLoading(true);
            const [stores, products, transfers, summary] = await Promise.all([
                this.fetchStores(),
                this.fetchProducts(),
                this.fetchTransfers(this.state.filters),
                this.fetchSummary()
            ]);
            
            this.state.stores = stores;
            this.state.products = products;
            this.state.transfers = transfers.results || transfers;
            this.state.totalItems = transfers.count || transfers.length;
            this.state.totalPages = Math.ceil(this.state.totalItems / TRANSFER_CONFIG.DEFAULT_PAGE_SIZE);
            this.state.stats = summary || { total_transfers: 0, total_quantity: 0, today: 0 };
            
            this.renderStores();
            this.renderProducts();
            this.renderTransfers();
            this.renderStats();
        } catch (error) {
            this.showError(TRANSFER_CONFIG.MESSAGES.ERROR_FETCH);
            console.error('Error loading data:', error);
        } finally {
            this.setLoading(false);
        }
    }

    async fetchStores() {
        try {
            const res = await fetch(TRANSFER_CONFIG.API_ENDPOINTS.STORES);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('Error fetching stores:', error);
            return [];
        }
    }

    async fetchProducts() {
        try {
            const res = await fetch(TRANSFER_CONFIG.API_ENDPOINTS.PRODUCTS);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('Error fetching products:', error);
            return [];
        }
    }

    async fetchTransfers(params = {}) {
        try {
            const queryString = new URLSearchParams(params).toString();
            const url = queryString ? `${TRANSFER_CONFIG.API_ENDPOINTS.TRANSFERS}?${queryString}` : TRANSFER_CONFIG.API_ENDPOINTS.TRANSFERS;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('Error fetching transfers:', error);
            return { results: [], count: 0 };
        }
    }

    async fetchSummary() {
        try {
            const res = await fetch(TRANSFER_CONFIG.API_ENDPOINTS.SUMMARY);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('Error fetching summary:', error);
            return { total_transfers: 0, total_quantity: 0, today: 0 };
        }
    }

    async updateStockInfo() {
        const productId = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_PRODUCT)?.value;
        const fromStoreId = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_FROM_STORE)?.value;
        const toStoreId = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_TO_STORE)?.value;
        const quantity = parseInt(document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_QUANTITY)?.value) || 0;

        if (!productId || !fromStoreId || !toStoreId) {
            this.clearStockInfo();
            return;
        }

        try {
            const [sourceStock, destStock] = await Promise.all([
                this.getStoreStock(productId, fromStoreId),
                this.getStoreStock(productId, toStoreId)
            ]);

            const sourceQty = sourceStock?.quantity || 0;
            const destQty = destStock?.quantity || 0;
            
            if (sourceQty < quantity) {
                this.showStockError(`Insufficient stock. Available: ${sourceQty}`);
                return;
            }

            this.renderStockInfo(sourceQty, destQty, quantity);
        } catch (error) {
            console.error('Error updating stock info:', error);
            this.showStockError('Error checking stock availability');
        }
    }

    async getStoreStock(productId, storeId) {
        try {
            const res = await fetch(`${TRANSFER_CONFIG.API_ENDPOINTS.STORE_STOCKS}?product=${productId}&store=${storeId}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return data.results?.[0] || data[0] || { quantity: 0 };
        } catch (error) {
            console.error('Error fetching store stock:', error);
            return { quantity: 0 };
        }
    }

    renderStockInfo(sourceQty, destQty, quantity) {
        const sourceCurrent = document.querySelector(TRANSFER_CONFIG.SELECTORS.SOURCE_CURRENT_STOCK);
        const sourceAfter = document.querySelector(TRANSFER_CONFIG.SELECTORS.SOURCE_AFTER_TRANSFER);
        const destCurrent = document.querySelector(TRANSFER_CONFIG.SELECTORS.DESTINATION_CURRENT_STOCK);
        const destAfter = document.querySelector(TRANSFER_CONFIG.SELECTORS.DESTINATION_AFTER_TRANSFER);
        const validationDiv = document.querySelector(TRANSFER_CONFIG.SELECTORS.VALIDATION_MESSAGE);
        
        if (sourceCurrent) sourceCurrent.textContent = sourceQty;
        if (sourceAfter) sourceAfter.textContent = sourceQty - quantity;
        if (destCurrent) destCurrent.textContent = destQty;
        if (destAfter) destAfter.textContent = destQty + quantity;
        
        if (validationDiv) {
            validationDiv.style.display = 'block';
            validationDiv.className = 'validation-message success';
            validationDiv.textContent = 'Transfer is valid';
            validationDiv.style.color = 'green';
        }
    }

    clearStockInfo() {
        const sourceCurrent = document.querySelector(TRANSFER_CONFIG.SELECTORS.SOURCE_CURRENT_STOCK);
        const sourceAfter = document.querySelector(TRANSFER_CONFIG.SELECTORS.SOURCE_AFTER_TRANSFER);
        const destCurrent = document.querySelector(TRANSFER_CONFIG.SELECTORS.DESTINATION_CURRENT_STOCK);
        const destAfter = document.querySelector(TRANSFER_CONFIG.SELECTORS.DESTINATION_AFTER_TRANSFER);
        const validationDiv = document.querySelector(TRANSFER_CONFIG.SELECTORS.VALIDATION_MESSAGE);
        
        if (sourceCurrent) sourceCurrent.textContent = '—';
        if (sourceAfter) sourceAfter.textContent = '—';
        if (destCurrent) destCurrent.textContent = '—';
        if (destAfter) destAfter.textContent = '—';
        if (validationDiv) validationDiv.style.display = 'none';
    }

    showStockError(message) {
        const validationDiv = document.querySelector(TRANSFER_CONFIG.SELECTORS.VALIDATION_MESSAGE);
        if (validationDiv) {
            validationDiv.style.display = 'block';
            validationDiv.className = 'validation-message error';
            validationDiv.textContent = message;
            validationDiv.style.color = 'red';
        }
    }

    async submitTransfer() {
        const product = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_PRODUCT)?.value;
        const fromStore = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_FROM_STORE)?.value;
        const toStore = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_TO_STORE)?.value;
        const quantity = parseInt(document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_QUANTITY)?.value);
        const notes = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_NOTES)?.value;

        const formData = {
            product: product,
            from_store: fromStore,
            to_store: toStore,
            quantity: quantity,
            notes: notes || ''
        };

        if (!this.validateForm(formData)) return;

        try {
            this.setLoading(true);
            const res = await fetch(TRANSFER_CONFIG.API_ENDPOINTS.TRANSFERS, {
                method: this.state.editId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.state.csrfToken
                },
                body: JSON.stringify(this.state.editId ? { ...formData, id: this.state.editId } : formData)
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.detail || error.message || TRANSFER_CONFIG.MESSAGES.ERROR_SAVE);
            }

            this.showSuccess(TRANSFER_CONFIG.MESSAGES.SUCCESS_CREATE);
            this.closeModal();
            await this.loadData();
        } catch (error) {
            this.showFormError(error.message);
            console.error('Error creating transfer:', error);
        } finally {
            this.setLoading(false);
        }
    }

    validateForm(data) {
        this.hideFormError();
        
        if (!data.product) return this.showFormError(TRANSFER_CONFIG.MESSAGES.VALIDATION.PRODUCT_REQUIRED);
        if (!data.from_store) return this.showFormError(TRANSFER_CONFIG.MESSAGES.VALIDATION.FROM_STORE_REQUIRED);
        if (!data.to_store) return this.showFormError(TRANSFER_CONFIG.MESSAGES.VALIDATION.TO_STORE_REQUIRED);
        if (data.from_store === data.to_store) return this.showFormError(TRANSFER_CONFIG.MESSAGES.VALIDATION.SAME_STORE);
        if (!data.quantity || data.quantity < 1) return this.showFormError(TRANSFER_CONFIG.MESSAGES.VALIDATION.QUANTITY_MIN);
        
        return true;
    }

    renderStores() {
        ['TRANSFER_FROM_STORE', 'TRANSFER_TO_STORE', 'FILTER_FROM_STORE', 'FILTER_TO_STORE'].forEach(selector => {
            const el = document.querySelector(TRANSFER_CONFIG.SELECTORS[selector]);
            if (el) {
                el.innerHTML = '<option value="">All Stores</option>';
                this.state.stores.forEach(store => {
                    const option = document.createElement('option');
                    option.value = store.id;
                    option.textContent = `${store.name} (${store.store_type || 'Unknown'})`;
                    el.appendChild(option);
                });
            }
        });
    }

    renderProducts() {
        ['TRANSFER_PRODUCT', 'FILTER_PRODUCT'].forEach(selector => {
            const el = document.querySelector(TRANSFER_CONFIG.SELECTORS[selector]);
            if (el) {
                el.innerHTML = '<option value="">All Products</option>';
                this.state.products.forEach(product => {
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = `${product.name} (${product.sku || 'No SKU'})`;
                    el.appendChild(option);
                });
            }
        });
    }

    renderTransfers() {
        const tbody = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_LIST);
        if (!tbody) return;

        if (!this.state.transfers.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:40px;">
                        <h3>No transfers found</h3>
                        <p>Create your first transfer by clicking "New Transfer"</p>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = '';
        this.state.transfers.forEach(transfer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(transfer.created_at || transfer.date).toLocaleDateString()}</td>
                <td>${transfer.product_name || transfer.product || 'Unknown'}</td>
                <td>${transfer.product_sku || transfer.sku || '—'}</td>
                <td>
                    <div>
                        <span>${transfer.from_store_name || transfer.from || 'Unknown'}</span>
                        <span> → </span>
                        <span>${transfer.to_store_name || transfer.to || 'Unknown'}</span>
                    </div>
                </td>
                <td><strong>${transfer.quantity || 0}</strong></td>
                <td>${transfer.performed_by_name || transfer.performed_by || '—'}</td>
                <td>
                    <small>
                        ${transfer.from_store_name || 'Source'}: ${transfer.source_stock_after || '—'} <br>
                        ${transfer.to_store_name || 'Destination'}: ${transfer.destination_stock_after || '—'}
                    </small>
                </td>
                <td>
                    <button class="btn-edit" data-id="${transfer.id}">Edit</button>
                </td>
            `;
            
            tbody.appendChild(row);
        });

        // Add event listeners to edit buttons
        tbody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => this.editTransfer(btn.dataset.id));
        });

        this.updatePagination();
    }

    renderStats() {
        const totalTransfers = document.querySelector(TRANSFER_CONFIG.SELECTORS.TOTAL_TRANSFERS);
        const totalQuantity = document.querySelector(TRANSFER_CONFIG.SELECTORS.TOTAL_QUANTITY);
        const todayCount = document.querySelector(TRANSFER_CONFIG.SELECTORS.TODAY_COUNT);
        
        if (totalTransfers) totalTransfers.textContent = this.state.stats.total_transfers || 0;
        if (totalQuantity) totalQuantity.textContent = this.state.stats.total_quantity || 0;
        if (todayCount) todayCount.textContent = this.state.stats.today || 0;
    }

    updatePagination() {
        const pageInfo = document.querySelector(TRANSFER_CONFIG.SELECTORS.PAGE_INFO);
        const prevBtn = document.querySelector(TRANSFER_CONFIG.SELECTORS.PREV_PAGE);
        const nextBtn = document.querySelector(TRANSFER_CONFIG.SELECTORS.NEXT_PAGE);
        
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

    async editTransfer(id) {
        try {
            const transfer = await this.fetchTransfer(id);
            if (transfer) {
                this.openModal(transfer);
            }
        } catch (error) {
            this.showError('Error loading transfer');
            console.error('Error loading transfer:', error);
        }
    }

    async fetchTransfer(id) {
        try {
            const res = await fetch(TRANSFER_CONFIG.API_ENDPOINTS.TRANSFER_DETAIL(id));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error('Error fetching transfer:', error);
            return null;
        }
    }

    openModal(transfer = null) {
        const modal = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_MODAL);
        const title = document.querySelector(TRANSFER_CONFIG.SELECTORS.MODAL_TITLE);
        
        if (!modal || !title) return;
        
        if (transfer) {
            title.textContent = 'Edit Transfer';
            this.state.editId = transfer.id;
            this.fillTransferForm(transfer);
        } else {
            title.textContent = 'New Transfer';
            this.clearForm();
            this.state.editId = null;
        }
        
        modal.style.display = 'block';
        this.showBackdrop();
    }

    closeModal() {
        const modal = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_MODAL);
        if (modal) {
            modal.style.display = 'none';
        }
        this.clearForm();
        this.state.editId = null;
        this.hideBackdrop();
        this.hideFormError();
    }

    fillTransferForm(transfer) {
        const productSelect = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_PRODUCT);
        const fromStoreSelect = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_FROM_STORE);
        const toStoreSelect = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_TO_STORE);
        const quantityInput = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_QUANTITY);
        const notesInput = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_NOTES);
        
        if (productSelect) productSelect.value = transfer.product || '';
        if (fromStoreSelect) fromStoreSelect.value = transfer.from_store || '';
        if (toStoreSelect) toStoreSelect.value = transfer.to_store || '';
        if (quantityInput) quantityInput.value = transfer.quantity || 1;
        if (notesInput) notesInput.value = transfer.notes || '';
        
        // Update stock info
        setTimeout(() => this.updateStockInfo(), 100);
    }

    clearForm() {
        const productSelect = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_PRODUCT);
        const fromStoreSelect = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_FROM_STORE);
        const toStoreSelect = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_TO_STORE);
        const quantityInput = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_QUANTITY);
        const notesInput = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_NOTES);
        
        if (productSelect) productSelect.value = '';
        if (fromStoreSelect) fromStoreSelect.value = '';
        if (toStoreSelect) toStoreSelect.value = '';
        if (quantityInput) quantityInput.value = '1';
        if (notesInput) notesInput.value = '';
        
        this.clearStockInfo();
    }

    applyFilters() {
        const productFilter = document.querySelector(TRANSFER_CONFIG.SELECTORS.FILTER_PRODUCT)?.value || '';
        const fromStoreFilter = document.querySelector(TRANSFER_CONFIG.SELECTORS.FILTER_FROM_STORE)?.value || '';
        const toStoreFilter = document.querySelector(TRANSFER_CONFIG.SELECTORS.FILTER_TO_STORE)?.value || '';
        const dateFrom = document.querySelector(TRANSFER_CONFIG.SELECTORS.FILTER_DATE_FROM)?.value || '';
        const dateTo = document.querySelector(TRANSFER_CONFIG.SELECTORS.FILTER_DATE_TO)?.value || '';
        
        this.state.filters = {
            product: productFilter,
            from_store: fromStoreFilter,
            to_store: toStoreFilter,
            date_from: dateFrom,
            date_to: dateTo
        };
        
        Object.keys(this.state.filters).forEach(k => {
            if (!this.state.filters[k]) delete this.state.filters[k];
        });
        
        this.state.currentPage = 1;
        this.loadData();
    }

    clearFilters() {
        const filters = ['FILTER_PRODUCT', 'FILTER_FROM_STORE', 'FILTER_TO_STORE', 'FILTER_DATE_FROM', 'FILTER_DATE_TO'];
        filters.forEach(id => {
            const el = document.querySelector(TRANSFER_CONFIG.SELECTORS[id]);
            if (el) el.value = '';
        });
        
        this.state.filters = {};
        this.state.currentPage = 1;
        this.loadData();
    }

    prevPage() {
        if (this.state.currentPage > 1) {
            this.state.currentPage--;
            this.loadData();
        }
    }

    nextPage() {
        if (this.state.currentPage < this.state.totalPages) {
            this.state.currentPage++;
            this.loadData();
        }
    }

    setLoading(isLoading) {
        this.state.isLoading = isLoading;
        const btn = document.querySelector(TRANSFER_CONFIG.SELECTORS.SUBMIT_BUTTON);
        if (btn) {
            btn.disabled = isLoading;
            btn.textContent = isLoading ? "Processing..." : (this.state.editId ? "Update Transfer" : "Create Transfer");
        }
    }

    showError(message) {
        const div = document.querySelector(TRANSFER_CONFIG.SELECTORS.ERROR_DIV);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
        }
    }

    showFormError(message) {
        const div = document.querySelector(TRANSFER_CONFIG.SELECTORS.FORM_ERROR);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
        }
        return false;
    }

    hideFormError() {
        const div = document.querySelector(TRANSFER_CONFIG.SELECTORS.FORM_ERROR);
        if (div) div.style.display = 'none';
    }

    showSuccess(message) {
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #28a745;
            color: white;
            border-radius: 4px;
            z-index: 1002;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        div.textContent = message;
        document.body.appendChild(div);
        
        setTimeout(() => {
            if (div.parentNode) {
                div.parentNode.removeChild(div);
            }
        }, 3000);
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
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.transferManager = new TransferManager();
});