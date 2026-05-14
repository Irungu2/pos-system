// static/inventory/js/bulk_restock_edit.js

class BulkRestockEdit {
    constructor() {
        this.restockId = this.getRestockId();
        this.restockData = null;
        this.items = [];
        this.selectedItems = new Set();
        this.currentPage = 1;
        this.totalPages = 1;
        this.availableProducts = [];

        this.init();
    }

    getRestockId() {
        const path = window.location.pathname;
        const match = path.match(/\/workflow-bulk-restocks\/(\d+)\/edit\//);
        return match ? match[1] : null;
    }

    async init() {
        if (!this.restockId) {
            this.showError('Invalid restock ID');
            return;
        }

        await this.loadRestockData();
        this.bindEvents();
    }

    bindEvents() {
        const saveBtn = document.getElementById('save-changes-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveChanges());
        }

        const continueBtn = document.getElementById('continue-review-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.continueToReview());
        }

        const addBtn = document.getElementById('add-products-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddProductsModal());
        }

        const bulkBtn = document.getElementById('bulk-update-btn');
        if (bulkBtn) {
            bulkBtn.addEventListener('click', () => this.openBulkUpdateModal());
        }

        const selectAll = document.getElementById('select-all-items');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }
    }

    async loadRestockData() {
        this.showLoading();

        try {
            const response = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/`,
                {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            console.log('Restock data:', data);

            this.restockData = data;
            this.items = data.items || [];

            this.updateUI();
            this.renderItemsTable();

        } catch (error) {
            console.error('Error loading restock:', error);
            this.showError(`Failed to load restock data: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    updateUI() {
        const storeName = document.getElementById('store-name');

        if (storeName) {
            storeName.textContent =
                this.restockData.store_name || 'Unknown Store';
        }

        const statusBadge = document.getElementById('status-badge');

        if (statusBadge) {
            statusBadge.innerHTML = `
                <span class="status-badge status-${this.restockData.status}">
                    ${this.restockData.status}
                </span>
            `;
        }

        const createdDate = document.getElementById('created-date');

        if (createdDate) {
            createdDate.textContent = new Date(
                this.restockData.generated_at
            ).toLocaleString();
        }

        this.updateSummary();
    }

    updateSummary() {
        let totalItems = this.items.length;
        let totalQuantity = 0;
        let totalValue = 0;

        this.items.forEach(item => {
            const quantity = Number(
                item.new_quantity ?? item.quantity_change ?? 0
            );

            const price = Number(
                item.new_price ?? item.current_price ?? 0
            );

            totalQuantity += quantity;
            totalValue += quantity * price;
        });

        const totalItemsEl = document.getElementById('total-items');
        if (totalItemsEl) {
            totalItemsEl.textContent = totalItems;
        }

        const totalQuantityEl = document.getElementById('total-quantity');
        if (totalQuantityEl) {
            totalQuantityEl.textContent = totalQuantity;
        }

        const totalValueEl = document.getElementById('total-value');
        if (totalValueEl) {
            totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
        }

        const footerQty = document.getElementById('footer-total-qty');
        if (footerQty) {
            footerQty.textContent = totalQuantity;
        }

        const footerValue = document.getElementById('footer-total-value');
        if (footerValue) {
            footerValue.textContent = `$${totalValue.toFixed(2)}`;
        }
    }

    renderItemsTable() {
        const tbody = document.getElementById('products-table-body');
        const footer = document.getElementById('products-table-footer');

        if (!tbody) return;

        if (!this.items || this.items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="empty">
                        No items in this restock
                    </td>
                </tr>
            `;

            if (footer) {
                footer.style.display = 'none';
            }

            return;
        }

        if (footer) {
            footer.style.display = 'table-footer-group';
        }

        tbody.innerHTML = this.items.map(item => {

            const quantity = Number(
                item.new_quantity ?? item.quantity_change ?? 0
            );

            const price = Number(
                item.new_price ?? item.current_price ?? 0
            );

            const subtotal = quantity * price;

            const isChecked = this.selectedItems.has(item.id);

            return `
                <tr data-item-id="${item.id}">
                    <td>
                        <input
                            type="checkbox"
                            class="item-select"
                            data-item-id="${item.id}"
                            ${isChecked ? 'checked' : ''}
                        >
                    </td>

                    <td>
                        ${this.escapeHtml(item.product_sku || '-')}
                    </td>

                    <td>
                        <strong>
                            ${this.escapeHtml(item.product_name || '-')}
                        </strong>
                    </td>

                    <td>
                        ${this.escapeHtml(
                            item.product_category || 'Uncategorized'
                        )}
                    </td>

                    <td>
                        ${item.current_quantity ?? 0}
                    </td>

                    <td>
                        $${Number(item.current_price ?? 0).toFixed(2)}
                    </td>

                    <td>
                        <input
                            type="number"
                            class="quantity-input"
                            data-item-id="${item.id}"
                            value="${quantity}"
                            min="1"
                            step="1"
                        >
                    </td>

                    <td>
                        <input
                            type="number"
                            class="price-input"
                            data-item-id="${item.id}"
                            value="${price}"
                            min="0"
                            step="0.01"
                        >
                    </td>

                    <td
                        class="subtotal"
                        data-item-id="${item.id}"
                    >
                        $${subtotal.toFixed(2)}
                    </td>

                    <td>
                        <button
                            class="btn-danger remove-item"
                            data-item-id="${item.id}"
                        >
                            Remove
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.item-select').forEach(cb => {
            cb.addEventListener('change', (e) => {
                this.toggleItemSelection(e);
            });
        });

        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateItemQuantity(e);
            });
        });

        document.querySelectorAll('.price-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateItemPrice(e);
            });
        });

        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removeItem(e);
            });
        });
    }

    toggleItemSelection(event) {
        const checkbox = event.target;
        const itemId = parseInt(checkbox.dataset.itemId);

        if (checkbox.checked) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }

        this.updateSelectAllCheckbox();
    }

    toggleSelectAll(checked) {
        if (checked) {
            this.items.forEach(item => {
                this.selectedItems.add(item.id);
            });
        } else {
            this.selectedItems.clear();
        }

        document.querySelectorAll('.item-select').forEach(cb => {
            cb.checked = checked;
        });
    }

    updateSelectAllCheckbox() {
        const selectAll = document.getElementById('select-all-items');

        if (selectAll) {
            selectAll.checked =
                this.selectedItems.size === this.items.length;
        }
    }

    async updateItemQuantity(event) {
        const input = event.target;
        const itemId = parseInt(input.dataset.itemId);

        let newQuantity = parseInt(input.value);

        if (isNaN(newQuantity) || newQuantity < 1) {
            newQuantity = 1;
            input.value = 1;
        }

        const item = this.items.find(i => i.id === itemId);

        if (!item) return;

        const newPrice = Number(
            item.new_price ?? item.current_price ?? 0
        );

        try {
            const response = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/update_item/`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        item_id: itemId,
                        new_quantity: newQuantity,
                        new_price: newPrice
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to update quantity');
            }

            const updatedItem = await response.json();

            const index = this.items.findIndex(i => i.id === itemId);

            if (index !== -1) {
                this.items[index] = updatedItem;
            }

            this.renderItemsTable();
            this.updateSummary();

        } catch (error) {
            console.error('Error updating quantity:', error);
            this.showError(error.message);
        }
    }

    async updateItemPrice(event) {
        const input = event.target;
        const itemId = parseInt(input.dataset.itemId);

        let newPrice = parseFloat(input.value);

        if (isNaN(newPrice) || newPrice < 0) {
            newPrice = 0;
            input.value = 0;
        }

        const item = this.items.find(i => i.id === itemId);

        if (!item) return;

        const newQuantity = Number(
            item.new_quantity ?? item.quantity_change ?? 0
        );

        try {
            const response = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/update_item/`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        item_id: itemId,
                        new_quantity: newQuantity,
                        new_price: newPrice
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to update price');
            }

            const updatedItem = await response.json();

            const index = this.items.findIndex(i => i.id === itemId);

            if (index !== -1) {
                this.items[index] = updatedItem;
            }

            this.renderItemsTable();
            this.updateSummary();

        } catch (error) {
            console.error('Error updating price:', error);
            this.showError(error.message);
        }
    }

    async removeItem(event) {
        const btn = event.target;
        const itemId = parseInt(btn.dataset.itemId);

        if (!confirm('Are you sure you want to remove this item?')) {
            return;
        }

        this.showLoading();

        try {
            const response = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/remove_item/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        item_id: itemId
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to remove item');
            }

            await this.loadRestockData();

        } catch (error) {
            console.error('Error removing item:', error);
            this.showError(error.message);

        } finally {
            this.hideLoading();
        }
    }

    continueToReview() {
        window.location.href =
            `/inventory/workflow-bulk-restocks/${this.restockId}/review/`;
    }

    getCookie(name) {
        let cookieValue = null;

        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');

            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();

                if (
                    cookie.substring(0, name.length + 1) ===
                    (name + '=')
                ) {
                    cookieValue = decodeURIComponent(
                        cookie.substring(name.length + 1)
                    );

                    break;
                }
            }
        }

        return cookieValue;
    }

    escapeHtml(text) {
        if (!text) return '';

        const div = document.createElement('div');
        div.textContent = text;

        return div.innerHTML;
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');

        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');

        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    showSuccess(message) {
        alert(message);
    }

    showError(message) {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.bulkRestockEdit = new BulkRestockEdit();
});