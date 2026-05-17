// class BulkRestockReview {
//     constructor() {
//         this.restockId = this.getRestockId();
//         this.restockData = null;
//         this.summaryData = null;

//         this.init();
//     }

//     getRestockId() {
//         const path = window.location.pathname;
//         const match = path.match(/\/inventory\/workflow-bulk-restocks\/(\d+)\/review\/?/);
//         return match ? match[1] : null;
//     }

//     async init() {
//         if (!this.restockId) {
//             console.error("Invalid URL:", window.location.pathname);
//             this.showError('Invalid restock ID (check URL)');
//             return;
//         }

//         await this.loadReviewData();
//         this.bindEvents();
//     }

//     bindEvents() {
//         document.getElementById('confirm-review-btn')
//             ?.addEventListener('click', () => this.confirmReview());

//         document.getElementById('back-to-edit-btn')
//             ?.addEventListener('click', () => {
//                 window.location.href =
//                     `/inventory/workflow-bulk-restocks/${this.restockId}/edit/`;
//             });

//         document.getElementById('cancel-btn')
//             ?.addEventListener('click', () => {
//                 if (confirm('Cancel restock?')) {
//                     window.location.href =
//                         '/inventory/workflow-bulk-restocks/';
//                 }
//             });
//     }

//     // async loadReviewData() {
//     //     this.showLoading();

//     //     try {
//     //         const restockResponse = await fetch(
//     //             `/inventory/workflow-bulk-restocks/${this.restockId}/`
//     //         );

//     //         if (!restockResponse.ok) throw new Error('Failed restock');

//     //         this.restockData = await restockResponse.json();

//     //         console.log('📦 Restock Data:', this.restockData);

//     //         const summaryResponse = await fetch(
//     //             `/inventory/workflow-bulk-restocks/${this.restockId}/summary/`
//     //         );

//     //         if (!summaryResponse.ok) throw new Error('Failed summary');

//     //         this.summaryData = await summaryResponse.json();

//     //         console.log('📊 Summary Data:', this.summaryData);

//     //         console.log('🧠 Combined State:', {
//     //             restockData: this.restockData,
//     //             summaryData: this.summaryData
//     //         });

//     //         this.updateUI();
//     //         this.renderSummary();
//     //         this.renderItemsTable();

//     //     } catch (error) {
//     //         console.error('❌ Load Review Error:', error);
//     //         this.showError('Failed to load review data');
//     //     } finally {
//     //         this.hideLoading();
//     //     }
//     // }

//     async loadReviewData() {
//         this.showLoading();

//         try {
//             const response = await fetch(
//                 // `/inventory/workflow-bulk-restocks/${this.restockId}/`
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/summary/`


//             );

//             if (!response.ok) {
//                 throw new Error('Failed to load restock data');
//             }

//             const data = await response.json();

//             this.restockData = data.restock;
//             this.summaryData = data.summary;

//             console.log('📦 Restock Data:', this.restockData);
//             console.log('📊 Summary Data:', this.summaryData);

//             this.updateUI();
//             this.renderSummary();
//             this.renderItemsTable();

//         } catch (error) {
//             console.error('❌ Load Review Error:', error);
//             this.showError('Failed to load review data');
//         } finally {
//             this.hideLoading();
//         }
//     }

//     num(val) {
//         const n = Number(val);
//         return isNaN(n) ? 0 : n;
//     }

//     updateUI() {
//         // ✅ FIX: store_name (not store.name)
//         const storeName = this.restockData?.store_name || '';

//         const storeEl = document.getElementById('store-name');
//         if (storeEl) storeEl.textContent = storeName;

//         const status = this.restockData?.status || 'draft';

//         const statusEl = document.getElementById('status-badge');
//         if (statusEl) {
//             statusEl.innerHTML =
//                 `<span class="status-badge status-${status}">
//                     ${status.toUpperCase()}
//                 </span>`;
//         }
//     }

//     renderSummary() {
//         const summary = this.summaryData?.summary;
//         if (!summary) return;

//         const set = (id, val) => {
//             const el = document.getElementById(id);
//             if (el) el.textContent = val;
//         };

//         set('summary-total-items', summary.total_items || 0);

//         // ❌ FIXED FIELD
//         set('summary-total-quantity', summary.total_quantity_added || 0);

//         set('summary-current-value',
//             `$${this.num(summary.total_current_value).toFixed(2)}`);

//         // ❌ FIXED FIELD
//         set('summary-total-value',
//             `$${this.num(summary.total_final_value).toFixed(2)}`);
//     }

//     renderItemsTable() {
//         const tbody = document.getElementById('review-items-body');
//         if (!tbody) return;

//         const items = this.restockData?.items || [];

//         if (!items.length) {
//             tbody.innerHTML = '<tr><td colspan="11">No items</td></tr>';
//             return;
//         }

//         let totalCurrentQty = 0;
//         let totalNewQty = 0;
//         let totalCurrentValue = 0;
//         let totalNewValue = 0;

//         tbody.innerHTML = items.map(item => {

//             const currentQty = this.num(item.current_quantity);

//             // ❌ FIX: correct field
//             const newQty = this.num(item.new_quantity ?? item.quantity_added);

//             const currentPrice = this.num(item.current_price);
//             const newPrice = this.num(item.new_price ?? currentPrice);

//             const change = newQty;

//             const currentTotal = currentQty * currentPrice;
//             const newTotal = newQty * newPrice;

//             const diff = newTotal - currentTotal;

//             totalCurrentQty += currentQty;
//             totalNewQty += newQty;
//             totalCurrentValue += currentTotal;
//             totalNewValue += newTotal;

//             return `
//                 <tr>
//                     <td>${this.escape(item.product_sku)}</td>
//                     <td>${this.escape(item.product_name)}</td>

//                     <!-- FIXED: flat category -->
//                     <td>${this.escape(item.product_category)}</td>

//                     <td>${currentQty}</td>
//                     <td><strong>${newQty}</strong></td>

//                     <td class="${change >= 0 ? 'positive' : 'negative'}">
//                         ${change >= 0 ? '+' : ''}${change}
//                     </td>

//                     <td>$${currentPrice.toFixed(2)}</td>
//                     <td>$${newPrice.toFixed(2)}</td>

//                     <td>$${currentTotal.toFixed(2)}</td>
//                     <td>$${newTotal.toFixed(2)}</td>

//                     <td class="${diff >= 0 ? 'positive' : 'negative'}">
//                         ${diff >= 0 ? '+' : ''}$${diff.toFixed(2)}
//                     </td>
//                 </tr>
//             `;
//         }).join('');

//         // footer
//         const setFooter = (id, val) => {
//             const el = document.getElementById(id);
//             if (el) el.textContent = val;
//         };

//         setFooter('footer-total-qty', totalNewQty);
//         setFooter('footer-current-total', `$${totalCurrentValue.toFixed(2)}`);
//         setFooter('footer-new-total', `$${totalNewValue.toFixed(2)}`);
//     }

//     escape(text) {
//         return (text || '').toString();
//     }

//     async confirmReview() {
//         try {
//             const res = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/submit_review/`,
//                 {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'X-CSRFToken': this.getCookie('csrftoken')
//                     }
//                 }
//             );

//             if (res.ok) {
//                 window.location.href =
//                     `/inventory/workflow-bulk-restocks/${this.restockId}/success/`;
//             } else {
//                 const err = await res.json();
//                 this.showError(err.error || 'Failed');
//             }
//         } catch (e) {
//             this.showError('Network error');
//         }
//     }

//     getCookie(name) {
//         let cookieValue = null;

//         document.cookie.split(';').forEach(cookie => {
//             const c = cookie.trim();
//             if (c.startsWith(name + '=')) {
//                 cookieValue = decodeURIComponent(c.split('=')[1]);
//             }
//         });

//         return cookieValue;
//     }

//     showLoading() {}
//     hideLoading() {}

//     showError(msg) {
//         alert(msg);
//     }
// }

// document.addEventListener('DOMContentLoaded', () => {
//     window.bulkRestockReview = new BulkRestockReview();
// });
class BulkRestockReview {
    constructor() {
        this.restockId = this.getRestockId();
        this.restockData = null;
        this.summaryData = null;

        this.init();
    }

    getRestockId() {
        const path = window.location.pathname;

        const match = path.match(
            /\/inventory\/workflow-bulk-restocks\/(\d+)\/review\/?/
        );

        return match ? match[1] : null;
    }

    async init() {
        if (!this.restockId) {
            this.showError('Invalid restock ID');
            return;
        }

        await this.loadReviewData();
        this.bindEvents();
    }

    bindEvents() {
        document
            .getElementById('confirm-review-btn')
            ?.addEventListener('click', () => this.confirmReview());

        document
            .getElementById('back-to-edit-btn')
            ?.addEventListener('click', () => {
                window.location.href =
                    `/inventory/workflow-bulk-restocks/${this.restockId}/edit/`;
            });

        document
            .getElementById('cancel-btn')
            ?.addEventListener('click', () => {
                if (confirm('Cancel restock?')) {
                    window.location.href =
                        '/inventory/workflow-bulk-restocks/';
                }
            });
    }

    async loadReviewData() {
        this.showLoading();

        try {
            const response = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/summary/`
            );

            if (!response.ok) {
                throw new Error('Failed to load review data');
            }

            const data = await response.json();

            this.restockData = data.restock || {};
            this.summaryData = data.summary || {};

            console.log('📦 Restock:', this.restockData);
            console.log('📊 Summary:', this.summaryData);

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

    num(value) {
        const n = Number(value);
        return isNaN(n) ? 0 : n;
    }

    updateUI() {
        const storeName = this.restockData.store_name || '';

        const storeEl = document.getElementById('store-name');

        if (storeEl) {
            storeEl.textContent = storeName;
        }

        const status = this.restockData.status || 'draft';

        const statusEl = document.getElementById('status-badge');

        if (statusEl) {
            statusEl.innerHTML = `
                <span class="status-badge status-${status}">
                    ${status.toUpperCase()}
                </span>
            `;
        }
    }

    renderSummary() {
        const summary = this.summaryData;

        const set = (id, value) => {
            const el = document.getElementById(id);

            if (el) {
                el.textContent = value;
            }
        };

        set('summary-total-items', summary.total_items || 0);

        set(
            'summary-total-quantity',
            summary.total_quantity_added || 0
        );

        set(
            'summary-current-value',
            `$${this.num(summary.total_current_value).toFixed(2)}`
        );

        set(
            'summary-total-value',
            `$${this.num(summary.total_final_value).toFixed(2)}`
        );
    }

    renderItemsTable() {
        const tbody = document.getElementById('review-items-body');

        if (!tbody) return;

        const items = this.restockData.items || [];

        if (!items.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11">No items found</td>
                </tr>
            `;
            return;
        }

        let totalFinalQty = 0;
        let totalCurrentValue = 0;
        let totalFinalValue = 0;

        tbody.innerHTML = items.map(item => {

            const currentQty = this.num(item.current_quantity);

            const quantityAdded = this.num(
                item.quantity_added ?? item.new_quantity
            );

            const finalQty = currentQty + quantityAdded;

            const currentPrice = this.num(item.current_price);

            const newPrice = this.num(
                item.new_price ?? item.current_price
            );

            const currentTotal = currentQty * currentPrice;

            const finalTotal = finalQty * newPrice;

            const valueIncrease = finalTotal - currentTotal;

            totalFinalQty += finalQty;
            totalCurrentValue += currentTotal;
            totalFinalValue += finalTotal;

            return `
                <tr>
                    <td>${this.escape(item.product_sku)}</td>

                    <td>${this.escape(item.product_name)}</td>

                    <td>${this.escape(item.product_category)}</td>

                    <td>${currentQty}</td>

                    <td>${finalQty}</td>

                    <td class="positive">
                        +${quantityAdded}
                    </td>

                    <td>$${currentPrice.toFixed(2)}</td>

                    <td>$${newPrice.toFixed(2)}</td>

                    <td>$${currentTotal.toFixed(2)}</td>

                    <td>$${finalTotal.toFixed(2)}</td>

                    <td class="${valueIncrease >= 0 ? 'positive' : 'negative'}">
                        ${valueIncrease >= 0 ? '+' : ''}
                        $${valueIncrease.toFixed(2)}
                    </td>
                </tr>
            `;
        }).join('');

        const setFooter = (id, value) => {
            const el = document.getElementById(id);

            if (el) {
                el.textContent = value;
            }
        };

        setFooter('footer-total-qty', totalFinalQty);

        setFooter(
            'footer-current-total',
            `$${totalCurrentValue.toFixed(2)}`
        );

        setFooter(
            'footer-new-total',
            `$${totalFinalValue.toFixed(2)}`
        );
    }

    escape(text) {
        return (text || '').toString();
    }

    async confirmReview() {
        try {
            const response = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/submit_review/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken')
                    }
                }
            );

            if (response.ok) {
                window.location.href =
                    `/inventory/workflow-bulk-restocks/${this.restockId}/success/`;
            } else {
                const err = await response.json();

                this.showError(
                    err.error || 'Failed to submit review'
                );
            }

        } catch (error) {
            console.error(error);
            this.showError('Network error');
        }
    }

    getCookie(name) {
        let cookieValue = null;

        document.cookie.split(';').forEach(cookie => {

            const c = cookie.trim();

            if (c.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(
                    c.split('=')[1]
                );
            }
        });

        return cookieValue;
    }

    showLoading() {}

    hideLoading() {}

    showError(message) {
        alert(message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.bulkRestockReview = new BulkRestockReview();
});