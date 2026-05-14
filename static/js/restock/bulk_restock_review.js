class BulkRestockReview {
    constructor() {
        this.restockId = this.getRestockId();
        this.restockData = null;
        this.summaryData = null;

        this.init();
    }

    // ✅ FIXED: correct URL path
    getRestockId() {
        const path = window.location.pathname;

        const match = path.match(/\/inventory\/workflow-bulk-restocks\/(\d+)\/review\/?/);

        return match ? match[1] : null;
    }

    async init() {
        if (!this.restockId) {
            console.error("Invalid URL:", window.location.pathname);
            this.showError('Invalid restock ID (check URL)');
            return;
        }

        await this.loadReviewData();
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('confirm-review-btn')
            ?.addEventListener('click', () => this.confirmReview());

        document.getElementById('back-to-edit-btn')
            ?.addEventListener('click', () => {
                window.location.href = `/inventory/workflow-bulk-restocks/${this.restockId}/edit/`;
            });

        document.getElementById('cancel-btn')
            ?.addEventListener('click', () => {
                if (confirm('Cancel restock?')) {
                    window.location.href = '/inventory/workflow-bulk-restocks/';
                }
            });
    }

    async loadReviewData() {
        this.showLoading();

        try {
            const restockResponse = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/`
            );

            if (!restockResponse.ok) throw new Error('Failed restock');

            this.restockData = await restockResponse.json();

            const summaryResponse = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/summary/`
            );

            if (!summaryResponse.ok) throw new Error('Failed summary');

            this.summaryData = await summaryResponse.json();

            this.updateUI();
            this.renderSummary();
            this.renderItemsTable();

        } catch (error) {
            console.error(error);
            this.showError('Failed to load review data');
        } finally {
            this.hideLoading();
        }
    }

    // ✅ SAFE number conversion helper
    num(val) {
        const n = Number(val);
        return isNaN(n) ? 0 : n;
    }

    updateUI() {
        document.getElementById('store-name') &&
        (document.getElementById('store-name').textContent =
            this.restockData?.store?.name || '');

        const status = this.restockData?.status || 'draft';

        document.getElementById('status-badge') &&
        (document.getElementById('status-badge').innerHTML =
            `<span class="status-badge status-${status}">${status.toUpperCase()}</span>`);
    }

    renderSummary() {
        const summary = this.summaryData?.summary;
        if (!summary) return;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        set('summary-total-items', summary.total_items || 0);
        set('summary-total-quantity', summary.total_quantity_increase || 0);

        set('summary-current-value',
            `$${this.num(summary.total_current_value).toFixed(2)}`);

        set('summary-total-value',
            `$${this.num(summary.total_new_value).toFixed(2)}`);
    }

    renderItemsTable() {
        const tbody = document.getElementById('review-items-body');
        if (!tbody) return;

        const items = this.restockData?.items || [];

        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="11">No items</td></tr>';
            return;
        }

        let totalCurrentQty = 0;
        let totalNewQty = 0;
        let totalCurrentValue = 0;
        let totalNewValue = 0;

        tbody.innerHTML = items.map(item => {

            const currentQty = this.num(item.current_quantity);
            const newQty = this.num(item.new_quantity || item.quantity_change);

            const currentPrice = this.num(item.current_price);
            const newPrice = this.num(item.new_price ?? currentPrice);

            const change = newQty - currentQty;

            const currentTotal = currentQty * currentPrice;
            const newTotal = newQty * newPrice;

            const diff = newTotal - currentTotal;

            totalCurrentQty += currentQty;
            totalNewQty += newQty;
            totalCurrentValue += currentTotal;
            totalNewValue += newTotal;

            return `
                <tr>
                    <td>${this.escape(item.product?.sku)}</td>
                    <td>${this.escape(item.product?.name)}</td>
                    <td>${this.escape(item.product?.category?.name)}</td>

                    <td>${currentQty}</td>
                    <td><strong>${newQty}</strong></td>

                    <td class="${change >= 0 ? 'positive' : 'negative'}">
                        ${change >= 0 ? '+' : ''}${change}
                    </td>

                    <td>$${currentPrice.toFixed(2)}</td>
                    <td>$${newPrice.toFixed(2)}</td>

                    <td>$${currentTotal.toFixed(2)}</td>
                    <td>$${newTotal.toFixed(2)}</td>

                    <td class="${diff >= 0 ? 'positive' : 'negative'}">
                        ${diff >= 0 ? '+' : ''}$${diff.toFixed(2)}
                    </td>
                </tr>
            `;
        }).join('');

        // footer safe
        document.getElementById('footer-total-qty') &&
        (document.getElementById('footer-total-qty').textContent = totalNewQty);

        document.getElementById('footer-current-total') &&
        (document.getElementById('footer-current-total').textContent =
            `$${totalCurrentValue.toFixed(2)}`);

        document.getElementById('footer-new-total') &&
        (document.getElementById('footer-new-total').textContent =
            `$${totalNewValue.toFixed(2)}`);
    }

    escape(text) {
        return (text || '').toString();
    }

    async confirmReview() {
        try {
            const res = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/submit_review/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken')
                    }
                }
            );

            if (res.ok) {
                window.location.href = '/inventory/workflow-bulk-restocks/';
            } else {
                const err = await res.json();
                this.showError(err.error || 'Failed');
            }
        } catch (e) {
            this.showError('Network error');
        }
    }

    getCookie(name) {
        let cookieValue = null;
        document.cookie.split(';').forEach(cookie => {
            const c = cookie.trim();
            if (c.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(c.split('=')[1]);
            }
        });
        return cookieValue;
    }

    showLoading() {}
    hideLoading() {}
    showError(msg) {
        alert(msg);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.bulkRestockReview = new BulkRestockReview();
});