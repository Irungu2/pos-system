
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

                throw new Error(
                    'Failed to load restock data'
                );
            }

            this.restockData = await response.json();

            console.log(
                '[SUCCESS PAGE] Restock Data:',
                this.restockData
            );

            this.updateUI();

        } catch (error) {

            console.error(
                '[SUCCESS PAGE] Error:',
                error
            );

            this.showError(
                'Failed to load restock details'
            );

        } finally {

            this.hideLoading();
        }
    }

    // ---------------------------------------------------
    // UPDATE UI
    // ---------------------------------------------------
    updateUI() {

        // -----------------------------------------
        // BASIC INFO
        // -----------------------------------------

        this.setText(
            'restock-id',
            `#${this.restockData.id}`
        );

        this.setText(
            'store-name',
            this.restockData.store?.name || 'Unknown'
        );

        // -----------------------------------------
        // STATUS
        // -----------------------------------------

        const statusEl =
            document.getElementById('status');

        if (statusEl) {

            statusEl.innerHTML = `
                <span class="status-badge status-${this.restockData.status}">
                    ${this.restockData.status.toUpperCase()}
                </span>
            `;
        }

        // -----------------------------------------
        // ITEMS
        // -----------------------------------------

        const items =
            this.restockData.items || [];

        // -----------------------------------------
        // TOTAL ITEMS
        // -----------------------------------------

        const totalItems = items.length;

        // -----------------------------------------
        // QUANTITY ADDED ONLY
        // Example:
        // current = 30
        // new_quantity = 5
        // added = 5
        // -----------------------------------------

        const totalQuantityAdded =
            items.reduce((sum, item) => {

                return sum + (
                    Number(item.new_quantity) || 0
                );

            }, 0);

        // -----------------------------------------
        // FINAL STOCK AFTER RESTOCK
        // Example:
        // 30 + 5 = 35
        // -----------------------------------------

        const totalFinalQuantity =
            items.reduce((sum, item) => {

                const currentQty =
                    Number(item.current_quantity) || 0;

                const addedQty =
                    Number(item.new_quantity) || 0;

                return sum + (
                    currentQty + addedQty
                );

            }, 0);

        // -----------------------------------------
        // CURRENT INVENTORY VALUE
        // Example:
        // 30 × 60
        // -----------------------------------------

        const totalCurrentValue =
            items.reduce((sum, item) => {

                const currentQty =
                    Number(item.current_quantity) || 0;

                const currentPrice =
                    Number(item.current_price) || 0;

                return sum + (
                    currentQty * currentPrice
                );

            }, 0);

        // -----------------------------------------
        // FINAL INVENTORY VALUE
        // Example:
        // (30 + 5) × 65
        // -----------------------------------------

        const totalFinalValue =
            items.reduce((sum, item) => {

                const currentQty =
                    Number(item.current_quantity) || 0;

                const addedQty =
                    Number(item.new_quantity) || 0;

                const finalPrice =
                    Number(
                        item.new_price ||
                        item.current_price
                    ) || 0;

                return sum + (
                    (currentQty + addedQty)
                    * finalPrice
                );

            }, 0);

        // -----------------------------------------
        // VALUE INCREASE
        // -----------------------------------------

        const totalValueAdded =
            totalFinalValue - totalCurrentValue;

        // -----------------------------------------
        // UPDATE TOTALS
        // -----------------------------------------

        this.setText(
            'total-items',
            totalItems
        );

        this.setText(
            'total-quantity-added',
            totalQuantityAdded
        );

        this.setText(
            'total-final-quantity',
            totalFinalQuantity
        );

        this.setCurrency(
            'total-current-value',
            totalCurrentValue
        );

        this.setCurrency(
            'total-final-value',
            totalFinalValue
        );

        this.setCurrency(
            'total-value-added',
            totalValueAdded
        );

        // -----------------------------------------
        // COMPLETED BY
        // -----------------------------------------

        const completedBy =
            this.restockData.completed_by;

        this.setText(
            'processed-by',
            completedBy?.first_name
            || completedBy?.username
            || completedBy?.email
            || 'System'
        );

        // -----------------------------------------
        // COMPLETED AT
        // -----------------------------------------

        const completedAt =
            this.restockData.completed_at
            || this.restockData.updated_at;

        if (completedAt) {

            this.setText(
                'processed-at',
                new Date(
                    completedAt
                ).toLocaleString()
            );
        }

        // -----------------------------------------
        // ITEMS TABLE
        // -----------------------------------------

        this.renderItemsTable(items);
    }

    // ---------------------------------------------------
    // RENDER ITEMS TABLE
    // ---------------------------------------------------
    renderItemsTable(items) {

        const tbody =
            document.getElementById(
                'restock-items-body'
            );

        if (!tbody) return;

        tbody.innerHTML = '';

        items.forEach(item => {

            const currentQty =
                Number(item.current_quantity) || 0;

            const addedQty =
                Number(item.new_quantity) || 0;

            const finalQty =
                currentQty + addedQty;

            const oldPrice =
                Number(item.current_price) || 0;

            const newPrice =
                Number(
                    item.new_price ||
                    item.current_price
                ) || 0;

            const row = document.createElement('tr');

            row.innerHTML = `
                <td>
                    ${item.product?.name || 'N/A'}
                </td>

                <td>
                    ${currentQty}
                </td>

                <td class="text-success fw-bold">
                    +${addedQty}
                </td>

                <td class="fw-bold">
                    ${finalQty}
                </td>

                <td>
                    ${this.formatCurrency(oldPrice)}
                </td>

                <td class="text-primary fw-bold">
                    ${this.formatCurrency(newPrice)}
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    // ---------------------------------------------------
    // HELPERS
    // ---------------------------------------------------
    setText(id, value) {

        const el =
            document.getElementById(id);

        if (el) {

            el.textContent = value;
        }
    }

    setCurrency(id, value) {

        const el =
            document.getElementById(id);

        if (el) {

            el.textContent =
                this.formatCurrency(value);
        }
    }

    formatCurrency(value) {

        return `KSh ${Number(value).toLocaleString(
            undefined,
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )}`;
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
            document.getElementById(
                'loading-overlay'
            );

        if (overlay) {

            overlay.style.display = 'flex';
        }
    }

    hideLoading() {

        const overlay =
            document.getElementById(
                'loading-overlay'
            );

        if (overlay) {

            overlay.style.display = 'none';
        }
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

document.addEventListener(
    'DOMContentLoaded',
    () => {

        window.bulkRestockSuccess =
            new BulkRestockSuccess();
    }
);