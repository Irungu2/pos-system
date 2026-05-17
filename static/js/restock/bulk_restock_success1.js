class BulkRestockSuccess {

    constructor() {

        this.restockId = this.getRestockId();

        this.restockData = null;

        this.init();
    }

    // ---------------------------------------------------
    // GET RESTOCK ID
    // ---------------------------------------------------
    getRestockId() {

        return window.RESTOCK_ID || null;
    }

    // ---------------------------------------------------
    // INIT
    // ---------------------------------------------------
    async init() {

        if (!this.restockId) {

            this.showError('Restock ID not found');

            return;
        }

        await this.loadRestockData();

        this.bindEvents();
    }

    // ---------------------------------------------------
    // EVENTS
    // ---------------------------------------------------
    bindEvents() {

        const printBtn =
            document.getElementById('print-summary-btn');

        if (printBtn) {

            printBtn.addEventListener(
                'click',
                () => this.printSummary()
            );
        }

        const newRestockBtn =
            document.getElementById('new-restock-btn');

        if (newRestockBtn) {

            newRestockBtn.addEventListener(
                'click',
                () => {

                    window.location.href =
                        '/inventory/workflow-bulk-restocks/create/';
                }
            );
        }
    }

    // ---------------------------------------------------
    // LOAD DATA
    // ---------------------------------------------------
    async loadRestockData() {

        this.showLoading();

        try {

            const response = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/`
            );

            if (!response.ok) {

                throw new Error('Failed to load restock data');
            }

            this.restockData = await response.json();

            console.log('[SUCCESS PAGE] Restock Data:', this.restockData);

            this.updateUI();

        } catch (error) {

            console.error('[SUCCESS PAGE] Error:', error);

            this.showError('Failed to load restock details');

        } finally {

            this.hideLoading();
        }
    }

    // ---------------------------------------------------
    // UPDATE UI
    // ---------------------------------------------------
    updateUI() {

        const data = this.restockData || {};
        const items = Array.isArray(data.items) ? data.items : [];

        // -----------------------------
        // BASIC INFO
        // -----------------------------

        this.setText('restock-id', `#${data.id}`);
        this.setText('store-name', data.store_name || 'Unknown');

        // -----------------------------
        // STATUS
        // -----------------------------

        const statusEl =
            document.getElementById('status');

        if (statusEl) {

            statusEl.innerHTML = `
                <span class="status-badge status-${data.status}">
                    ${(data.status || '').toUpperCase()}
                </span>
            `;
        }

        // -----------------------------
        // TOTAL ITEMS (FROM API)
        // -----------------------------

        this.setText(
            'total-items',
            data.total_items ?? items.length
        );

        // -----------------------------
        // TOTAL QUANTITY ADDED (FROM API)
        // -----------------------------

        this.setText(
            'total-quantity-added',
            data.total_quantity_added ?? 0
        );

        // -----------------------------
        // FINAL QUANTITY (SAFE CALC)
        // -----------------------------

        const totalFinalQuantity =
            items.reduce((sum, item) => {

                return sum + (
                    Number(item.current_quantity || 0) +
                    Number(item.new_quantity || 0)
                );

            }, 0);

        this.setText('total-final-quantity', totalFinalQuantity);

        // -----------------------------
        // CURRENT VALUE
        // -----------------------------

        const totalCurrentValue =
            items.reduce((sum, item) => {

                return sum + (
                    Number(item.current_quantity || 0) *
                    Number(item.current_price || 0)
                );

            }, 0);

        this.setCurrency('total-current-value', totalCurrentValue);

        // -----------------------------
        // FINAL VALUE
        // -----------------------------

        const totalFinalValue =
            items.reduce((sum, item) => {

                const price =
                    Number(item.new_price || item.current_price || 0);

                return sum + (
                    (Number(item.current_quantity || 0) +
                     Number(item.new_quantity || 0)) * price
                );

            }, 0);

        this.setCurrency('total-final-value', totalFinalValue);

        // -----------------------------
        // VALUE ADDED (FROM API)
        // -----------------------------

        this.setCurrency(
            'total-value-added',
            data.total_value_added ?? 0
        );

        // -----------------------------
        // COMPLETED BY
        // -----------------------------

        this.setText(
            'processed-by',
            data.completed_by_name || 'System'
        );

        // -----------------------------
        // COMPLETED AT
        // -----------------------------

        if (data.completed_at) {

            this.setText(
                'processed-at',
                new Date(data.completed_at).toLocaleString()
            );
        }

        // -----------------------------
        // TABLE
        // -----------------------------

        this.renderItemsTable(items);
    }

    // ---------------------------------------------------
    // RENDER ITEMS TABLE
    // ---------------------------------------------------
    renderItemsTable(items) {

        const tbody =
            document.getElementById('restock-items-body');

        if (!tbody) return;

        tbody.innerHTML = '';

        items.forEach(item => {

            const currentQty = Number(item.current_quantity || 0);
            const addedQty = Number(item.new_quantity || 0);
            const finalQty = currentQty + addedQty;

            const oldPrice = Number(item.current_price || 0);
            const newPrice = Number(item.new_price || item.current_price || 0);

            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${item.product_name || 'N/A'}</td>
                <td>${currentQty}</td>
                <td class="text-success fw-bold">+${addedQty}</td>
                <td class="fw-bold">${finalQty}</td>
                <td>${this.formatCurrency(oldPrice)}</td>
                <td class="text-primary fw-bold">${this.formatCurrency(newPrice)}</td>
            `;

            tbody.appendChild(row);
        });
    }

    // ---------------------------------------------------
    // HELPERS
    // ---------------------------------------------------
    setText(id, value) {

        const el = document.getElementById(id);

        if (el) el.textContent = value ?? '';
    }

    setCurrency(id, value) {

        const el = document.getElementById(id);

        if (el) el.textContent = this.formatCurrency(value);
    }

    formatCurrency(value) {

        return `KSh ${Number(value || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    // ---------------------------------------------------
    // PRINT
    // ---------------------------------------------------
    printSummary() {

        window.print();
    }

    // ---------------------------------------------------
    // LOADING
    // ---------------------------------------------------
    showLoading() {

        const overlay =
            document.getElementById('loading-overlay');

        if (overlay) overlay.style.display = 'flex';
    }

    hideLoading() {

        const overlay =
            document.getElementById('loading-overlay');

        if (overlay) overlay.style.display = 'none';
    }

    // ---------------------------------------------------
    // ERROR
    // ---------------------------------------------------
    showError(message) {

        alert(message);

        window.location.href =
            '/inventory/workflow-bulk-restocks/';
    }
}

// ---------------------------------------------------
// INIT
// ---------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {

    window.bulkRestockSuccess =
        new BulkRestockSuccess();
});