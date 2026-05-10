/* ============================================================
   SIMPLIFIED STOCK TRANSFER MODULE (No Approval)
   UPDATED: transfer_id support + backend service alignment
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
        SUCCESS_CREATE: 'Transfer completed successfully!',
        ERROR_FETCH: 'Error loading transfer data',
        ERROR_SAVE: 'Error creating transfer',
        VALIDATION: {
            PRODUCT_REQUIRED: 'Product is required',
            FROM_STORE_REQUIRED: 'Source store is required',
            TO_STORE_REQUIRED: 'Destination store is required',
            QUANTITY_MIN: 'Quantity must be at least 1',
            SAME_STORE: 'Source and destination cannot be the same store',
        }
    },

    DEFAULT_PAGE_SIZE: 20
};

/* ============================================================
   STATE
============================================================ */

class TransferState {
    constructor() {
        this.transfers = [];
        this.stores = [];
        this.products = [];
        this.filters = {};
        this.stats = {};
        this.isLoading = false;
        this.csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.editId = null;
    }
}

/* ============================================================
   MAIN CLASS
============================================================ */

class TransferManager {
    constructor() {
        this.state = new TransferState();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadData();
    }

    /* ---------------- EVENTS ---------------- */

    bindEvents() {
        document.querySelector(TRANSFER_CONFIG.SELECTORS.NEW_BUTTON)
            ?.addEventListener('click', () => this.openModal());

        document.querySelector(TRANSFER_CONFIG.SELECTORS.SUBMIT_BUTTON)
            ?.addEventListener('click', () => this.submitTransfer());

        document.querySelector(TRANSFER_CONFIG.SELECTORS.CANCEL_BUTTON)
            ?.addEventListener('click', () => this.closeModal());

        document.querySelector(TRANSFER_CONFIG.SELECTORS.APPLY_FILTERS)
            ?.addEventListener('click', () => this.applyFilters());

        document.querySelector(TRANSFER_CONFIG.SELECTORS.CLEAR_FILTERS)
            ?.addEventListener('click', () => this.clearFilters());

        document.querySelector(TRANSFER_CONFIG.SELECTORS.PREV_PAGE)
            ?.addEventListener('click', () => this.prevPage());

        document.querySelector(TRANSFER_CONFIG.SELECTORS.NEXT_PAGE)
            ?.addEventListener('click', () => this.nextPage());
    }

    /* ---------------- DATA LOADING ---------------- */

    async loadData() {
        try {
            this.setLoading(true);

            const [stores, products, transfers, summary] = await Promise.all([
                this.fetchStores(),
                this.fetchProducts(),
                this.fetchTransfers({ ...this.state.filters, page: this.state.currentPage }),
                this.fetchSummary()
            ]);

            this.state.stores = stores;
            this.state.products = products;

            this.state.transfers = transfers.results ?? transfers;
            this.state.totalItems = transfers.count ?? transfers.length ?? 0;
            this.state.totalPages = Math.ceil(this.state.totalItems / TRANSFER_CONFIG.DEFAULT_PAGE_SIZE);

            this.state.stats = summary || {};

            this.renderStores();
            this.renderProducts();
            this.renderTransfers();
            this.renderStats();

        } catch (err) {
            this.showError(TRANSFER_CONFIG.MESSAGES.ERROR_FETCH);
            console.error(err);
        } finally {
            this.setLoading(false);
        }
    }

    async fetchTransfers(params = {}) {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(`${TRANSFER_CONFIG.API_ENDPOINTS.TRANSFERS}?${qs}`);
        if (!res.ok) throw new Error('Failed transfers fetch');
        return res.json();
    }

    async fetchStores() {
        const res = await fetch(TRANSFER_CONFIG.API_ENDPOINTS.STORES);
        return res.ok ? res.json() : [];
    }

    async fetchProducts() {
        const res = await fetch(TRANSFER_CONFIG.API_ENDPOINTS.PRODUCTS);
        return res.ok ? res.json() : [];
    }

    async fetchSummary() {
        const res = await fetch(TRANSFER_CONFIG.API_ENDPOINTS.SUMMARY);
        return res.ok ? res.json() : {};
    }

    /* ---------------- SUBMIT (UPDATED FOR BACKEND transfer_id) ---------------- */

    async submitTransfer() {
        const formData = {
            product: document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_PRODUCT)?.value,
            from_store: document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_FROM_STORE)?.value,
            to_store: document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_TO_STORE)?.value,
            quantity: parseInt(document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_QUANTITY)?.value),
            notes: document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_NOTES)?.value || ''
        };

        if (!this.validateForm(formData)) return;

        try {
            this.setLoading(true);

            const res = await fetch(TRANSFER_CONFIG.API_ENDPOINTS.TRANSFERS, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.state.csrfToken
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || 'Transfer failed');
            }

            // ✅ NEW: handle transfer_id from backend
            console.log("Transfer Group ID:", data.transfer_id);

            this.showSuccess(TRANSFER_CONFIG.MESSAGES.SUCCESS_CREATE);
            this.closeModal();
            await this.loadData();

        } catch (err) {
            this.showError(err.message);
        } finally {
            this.setLoading(false);
        }
    }

    /* ---------------- RENDER TRANSFERS (UPDATED WITH transfer_id) ---------------- */

    renderTransfers() {
        const tbody = document.querySelector(TRANSFER_CONFIG.SELECTORS.TRANSFER_LIST);
        if (!tbody) return;

        if (!this.state.transfers.length) {
            tbody.innerHTML = `<tr><td colspan="8">No transfers found</td></tr>`;
            return;
        }

        tbody.innerHTML = '';

        this.state.transfers.forEach(t => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${new Date(t.created_at).toLocaleDateString()}</td>

                <td>
                    <strong>${t.product_name}</strong>
                </td>

                <td>
                    <small>Group:</small><br>
                    <code>${t.transfer_id || '—'}</code>
                </td>

                <td>
                    ${t.from_store_name} → ${t.to_store_name}
                </td>

                <td><strong>${t.quantity}</strong></td>

                <td>${t.performed_by_name || '—'}</td>

                <td>
                    OUT: ${t.source_stock_after ?? '—'} <br>
                    IN: ${t.destination_stock_after ?? '—'}
                </td>

                <td>
                    <button data-id="${t.id}" class="btn-edit">Edit</button>
                </td>
            `;

            tbody.appendChild(row);
        });

        this.updatePagination();
    }

    /* ---------------- VALIDATION ---------------- */

    validateForm(d) {
        if (!d.product) return this.showFormError('Product required');
        if (!d.from_store) return this.showFormError('From store required');
        if (!d.to_store) return this.showFormError('To store required');
        if (d.from_store === d.to_store) return this.showFormError('Stores cannot match');
        if (!d.quantity || d.quantity < 1) return this.showFormError('Quantity invalid');
        return true;
    }

    /* ---------------- UI HELPERS ---------------- */

    showSuccess(msg) { alert(msg); }
    showError(msg) { console.error(msg); }
    showFormError(msg) { alert(msg); return false; }

    setLoading(v) { this.state.isLoading = v; }

    closeModal() {}
    openModal() {}

    applyFilters() { this.state.currentPage = 1; this.loadData(); }
    clearFilters() { this.state.filters = {}; this.loadData(); }

    prevPage() { if (this.state.currentPage > 1) { this.state.currentPage--; this.loadData(); } }
    nextPage() { this.state.currentPage++; this.loadData(); }

    updatePagination() {}
    renderStores() {}
    renderProducts() {}
    renderStats() {}
}

/* ============================================================
   INIT
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    window.transferManager = new TransferManager();
});