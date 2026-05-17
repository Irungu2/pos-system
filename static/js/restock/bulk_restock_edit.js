// // static/inventory/js/bulk_restock_edit.js

// class BulkRestockEdit {
//     constructor() {
//         this.restockId = this.getRestockId();
//         this.restockData = null;
//         this.items = [];
//         this.selectedItems = new Set();
//         this.currentPage = 1;
//         this.totalPages = 1;
//         this.availableProducts = [];

//         this.init(); 
//     }

//     getRestockId() {
//         const path = window.location.pathname;
//         const match = path.match(/\/workflow-bulk-restocks\/(\d+)\/edit\//);
//         return match ? match[1] : null;
//     }

//     async init() {
//         if (!this.restockId) {
//             this.showError('Invalid restock ID');
//             return;
//         }

//         await this.loadRestockData();
//         this.bindEvents();
//     }

//     bindEvents() {
//         const saveBtn = document.getElementById('save-changes-btn');
//         if (saveBtn) {
//             saveBtn.addEventListener('click', () => this.saveChanges());
//         }

//         const continueBtn = document.getElementById('continue-review-btn');
//         if (continueBtn) {
//             continueBtn.addEventListener('click', () => this.continueToReview());
//         }

//         const addBtn = document.getElementById('add-products-btn');
//         if (addBtn) {
//             addBtn.addEventListener('click', () => this.openAddProductsModal());
//         }

//         const bulkBtn = document.getElementById('bulk-update-btn');
//         if (bulkBtn) {
//             bulkBtn.addEventListener('click', () => this.openBulkUpdateModal());
//         }

//         const selectAll = document.getElementById('select-all-items');
//         if (selectAll) {
//             selectAll.addEventListener('change', (e) => {
//                 this.toggleSelectAll(e.target.checked);
//             });
//         }
//     }

//     async loadRestockData() {
//         this.showLoading();

//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/`,
//                 {
//                     method: 'GET',
//                     credentials: 'same-origin',
//                     headers: {
//                         'Accept': 'application/json'
//                     }
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error(`HTTP ${response.status}`);
//             }

//             const data = await response.json();

//             console.log('Restock data:', data);

//             this.restockData = data;
//             this.items = data.items || [];

//             this.updateUI();
//             this.renderItemsTable();

//         } catch (error) {
//             console.error('Error loading restock:', error);
//             this.showError(`Failed to load restock data: ${error.message}`);
//         } finally {
//             this.hideLoading();
//         }
//     }

//     updateUI() {
//         const storeName = document.getElementById('store-name');

//         if (storeName) {
//             storeName.textContent =
//                 this.restockData.store_name || 'Unknown Store';
//         }

//         const statusBadge = document.getElementById('status-badge');

//         if (statusBadge) {
//             statusBadge.innerHTML = `
//                 <span class="status-badge status-${this.restockData.status}">
//                     ${this.restockData.status}
//                 </span>
//             `;
//         }

//         const createdDate = document.getElementById('created-date');

//         if (createdDate) {
//             createdDate.textContent = new Date(
//                 this.restockData.generated_at
//             ).toLocaleString();
//         }

//         this.updateSummary();
//     }

//     updateSummary() {
//         let totalItems = this.items.length;
//         let totalQuantity = 0;
//         let totalValue = 0;

//         this.items.forEach(item => {
//             const quantity = Number(
//                 item.new_quantity ?? item.quantity_change ?? 0
//             );

//             const price = Number(
//                 item.new_price ?? item.current_price ?? 0
//             );

//             totalQuantity += quantity;
//             totalValue += quantity * price;
//         });

//         const totalItemsEl = document.getElementById('total-items');
//         if (totalItemsEl) {
//             totalItemsEl.textContent = totalItems;
//         }

//         const totalQuantityEl = document.getElementById('total-quantity');
//         if (totalQuantityEl) {
//             totalQuantityEl.textContent = totalQuantity;
//         }

//         const totalValueEl = document.getElementById('total-value');
//         if (totalValueEl) {
//             totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
//         }

//         const footerQty = document.getElementById('footer-total-qty');
//         if (footerQty) {
//             footerQty.textContent = totalQuantity;
//         }

//         const footerValue = document.getElementById('footer-total-value');
//         if (footerValue) {
//             footerValue.textContent = `$${totalValue.toFixed(2)}`;
//         }
//     }

//     renderItemsTable() {
//         const tbody = document.getElementById('products-table-body');
//         const footer = document.getElementById('products-table-footer');

//         if (!tbody) return;

//         if (!this.items || this.items.length === 0) {
//             tbody.innerHTML = `
//                 <tr>
//                     <td colspan="10" class="empty">
//                         No items in this restock
//                     </td>
//                 </tr>
//             `;

//             if (footer) {
//                 footer.style.display = 'none';
//             }

//             return;
//         }

//         if (footer) {
//             footer.style.display = 'table-footer-group';
//         }

//         tbody.innerHTML = this.items.map(item => {

//             const quantity = Number(
//                 item.new_quantity ?? item.quantity_change ?? 0
//             );

//             const price = Number(
//                 item.new_price ?? item.current_price ?? 0
//             );

//             const subtotal = quantity * price;

//             const isChecked = this.selectedItems.has(item.id);

//             return `
//                 <tr data-item-id="${item.id}">
//                     <td>
//                         <input
//                             type="checkbox"
//                             class="item-select"
//                             data-item-id="${item.id}"
//                             ${isChecked ? 'checked' : ''}
//                         >
//                     </td>

//                     <td>
//                         ${this.escapeHtml(item.product_sku || '-')}
//                     </td>

//                     <td>
//                         <strong>
//                             ${this.escapeHtml(item.product_name || '-')}
//                         </strong>
//                     </td>

//                     <td>
//                         ${this.escapeHtml(
//                             item.product_category || 'Uncategorized'
//                         )}
//                     </td>

//                     <td>
//                         ${item.current_quantity ?? 0}
//                     </td>

//                     <td>
//                         $${Number(item.current_price ?? 0).toFixed(2)}
//                     </td>

//                     <td>
//                         <input
//                             type="number"
//                             class="quantity-input"
//                             data-item-id="${item.id}"
//                             value="${quantity}"
//                             min="1"
//                             step="1"
//                         >
//                     </td>

//                     <td>
//                         <input
//                             type="number"
//                             class="price-input"
//                             data-item-id="${item.id}"
//                             value="${price}"
//                             min="0"
//                             step="0.01"
//                         >
//                     </td>

//                     <td
//                         class="subtotal"
//                         data-item-id="${item.id}"
//                     >
//                         $${subtotal.toFixed(2)}
//                     </td>

//                     <td>
//                         <button
//                             class="btn-danger remove-item"
//                             data-item-id="${item.id}"
//                         >
//                             Remove
//                         </button>
//                     </td>
//                 </tr>
//             `;
//         }).join('');

//         document.querySelectorAll('.item-select').forEach(cb => {
//             cb.addEventListener('change', (e) => {
//                 this.toggleItemSelection(e);
//             });
//         });

//         document.querySelectorAll('.quantity-input').forEach(input => {
//             input.addEventListener('change', (e) => {
//                 this.updateItemQuantity(e);
//             });
//         });

//         document.querySelectorAll('.price-input').forEach(input => {
//             input.addEventListener('change', (e) => {
//                 this.updateItemPrice(e);
//             });
//         });

//         document.querySelectorAll('.remove-item').forEach(btn => {
//             btn.addEventListener('click', (e) => {
//                 this.removeItem(e);
//             });
//         });
//     }

//     toggleItemSelection(event) {
//         const checkbox = event.target;
//         const itemId = parseInt(checkbox.dataset.itemId);

//         if (checkbox.checked) {
//             this.selectedItems.add(itemId);
//         } else {
//             this.selectedItems.delete(itemId);
//         }

//         this.updateSelectAllCheckbox();
//     }

//     toggleSelectAll(checked) {
//         if (checked) {
//             this.items.forEach(item => {
//                 this.selectedItems.add(item.id);
//             });
//         } else {
//             this.selectedItems.clear();
//         }

//         document.querySelectorAll('.item-select').forEach(cb => {
//             cb.checked = checked;
//         });
//     }

//     updateSelectAllCheckbox() {
//         const selectAll = document.getElementById('select-all-items');

//         if (selectAll) {
//             selectAll.checked =
//                 this.selectedItems.size === this.items.length;
//         }
//     }

//     async updateItemQuantity(event) {
//         const input = event.target;
//         const itemId = parseInt(input.dataset.itemId);

//         let newQuantity = parseInt(input.value);

//         if (isNaN(newQuantity) || newQuantity < 1) {
//             newQuantity = 1;
//             input.value = 1;
//         }

//         const item = this.items.find(i => i.id === itemId);

//         if (!item) return;

//         const newPrice = Number(
//             item.new_price ?? item.current_price ?? 0
//         );

//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/update_item/`,
//                 {
//                     method: 'PATCH',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'X-CSRFToken': this.getCookie('csrftoken')
//                     },
//                     body: JSON.stringify({
//                         item_id: itemId,
//                         new_quantity: newQuantity,
//                         new_price: newPrice
//                     })
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error('Failed to update quantity');
//             }

//             const updatedItem = await response.json();

//             const index = this.items.findIndex(i => i.id === itemId);

//             if (index !== -1) {
//                 this.items[index] = updatedItem;
//             }

//             this.renderItemsTable();
//             this.updateSummary();

//         } catch (error) {
//             console.error('Error updating quantity:', error);
//             this.showError(error.message);
//         }
//     }

//     async updateItemPrice(event) {
//         const input = event.target;
//         const itemId = parseInt(input.dataset.itemId);

//         let newPrice = parseFloat(input.value);

//         if (isNaN(newPrice) || newPrice < 0) {
//             newPrice = 0;
//             input.value = 0;
//         }

//         const item = this.items.find(i => i.id === itemId);

//         if (!item) return;

//         const newQuantity = Number(
//             item.new_quantity ?? item.quantity_change ?? 0
//         );

//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/update_item/`,
//                 {
//                     method: 'PATCH',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'X-CSRFToken': this.getCookie('csrftoken')
//                     },
//                     body: JSON.stringify({
//                         item_id: itemId,
//                         new_quantity: newQuantity,
//                         new_price: newPrice
//                     })
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error('Failed to update price');
//             }

//             const updatedItem = await response.json();

//             const index = this.items.findIndex(i => i.id === itemId);

//             if (index !== -1) {
//                 this.items[index] = updatedItem;
//             }

//             this.renderItemsTable();
//             this.updateSummary();

//         } catch (error) {
//             console.error('Error updating price:', error);
//             this.showError(error.message);
//         }
//     }

//     async removeItem(event) {
//         const btn = event.target;
//         const itemId = parseInt(btn.dataset.itemId);

//         if (!confirm('Are you sure you want to remove this item?')) {
//             return;
//         }

//         this.showLoading();

//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/remove_item/`,
//                 {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'X-CSRFToken': this.getCookie('csrftoken')
//                     },
//                     body: JSON.stringify({
//                         item_id: itemId
//                     })
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error('Failed to remove item');
//             }

//             await this.loadRestockData();

//         } catch (error) {
//             console.error('Error removing item:', error);
//             this.showError(error.message);

//         } finally {
//             this.hideLoading();
//         }
//     }

//     continueToReview() {
//         window.location.href =
//             `/inventory/workflow-bulk-restocks/${this.restockId}/review/`;
//     }

//     getCookie(name) {
//         let cookieValue = null;

//         if (document.cookie && document.cookie !== '') {
//             const cookies = document.cookie.split(';');

//             for (let i = 0; i < cookies.length; i++) {
//                 const cookie = cookies[i].trim();

//                 if (
//                     cookie.substring(0, name.length + 1) ===
//                     (name + '=')
//                 ) {
//                     cookieValue = decodeURIComponent(
//                         cookie.substring(name.length + 1)
//                     );

//                     break;
//                 }
//             }
//         }

//         return cookieValue;
//     }

//     escapeHtml(text) {
//         if (!text) return '';

//         const div = document.createElement('div');
//         div.textContent = text;

//         return div.innerHTML;
//     }

//     showLoading() {
//         const overlay = document.getElementById('loading-overlay');

//         if (overlay) {
//             overlay.style.display = 'flex';
//         }
//     }

//     hideLoading() {
//         const overlay = document.getElementById('loading-overlay');

//         if (overlay) {
//             overlay.style.display = 'none';
//         }
//     }

//     showSuccess(message) {
//         alert(message);
//     }

//     showError(message) {
//         alert(message);
//     }
// }

// document.addEventListener('DOMContentLoaded', () => {
//     window.bulkRestockEdit = new BulkRestockEdit();
// });
// static/inventory/js/bulk_restock_edit.js

// class BulkRestockEdit {
//     constructor() {
//         this.restockId = this.getRestockId();
//         this.restockData = null;
//         this.items = [];
//         this.selectedItems = new Set();
//         this.currentPage = 1;
//         this.totalPages = 1;
//         this.availableProducts = [];

//         this.init(); 
//     }

//     getRestockId() {
//         const path = window.location.pathname;
//         const match = path.match(/\/workflow-bulk-restocks\/(\d+)\/edit\//);
//         return match ? match[1] : null;
//     }

//     async init() {
//         if (!this.restockId) {
//             this.showError('Invalid restock ID');
//             return;
//         }

//         await this.loadRestockData();
//         this.bindEvents();
//     }

//     bindEvents() {
//         const saveBtn = document.getElementById('save-changes-btn');
//         if (saveBtn) {
//             saveBtn.addEventListener('click', () => this.saveChanges());
//         }

//         const continueBtn = document.getElementById('continue-review-btn');
//         if (continueBtn) {
//             continueBtn.addEventListener('click', () => this.continueToReview());
//         }

//         const addBtn = document.getElementById('add-products-btn');
//         if (addBtn) {
//             addBtn.addEventListener('click', () => this.openAddProductsModal());
//         }

//         const bulkBtn = document.getElementById('bulk-update-btn');
//         if (bulkBtn) {
//             bulkBtn.addEventListener('click', () => this.openBulkUpdateModal());
//         }

//         const selectAll = document.getElementById('select-all-items');
//         if (selectAll) {
//             selectAll.addEventListener('change', (e) => {
//                 this.toggleSelectAll(e.target.checked);
//             });
//         }
//     }

//     async loadRestockData() {
//         this.showLoading();

//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/`,
//                 {
//                     method: 'GET',
//                     credentials: 'same-origin',
//                     headers: {
//                         'Accept': 'application/json'
//                     }
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error(`HTTP ${response.status}`);
//             }

//             const data = await response.json();

//             console.log('Restock data:', data);

//             this.restockData = data;
//             this.items = data.items || [];

//             this.updateUI();
//             this.renderItemsTable();

//         } catch (error) {
//             console.error('Error loading restock:', error);
//             this.showError(`Failed to load restock data: ${error.message}`);
//         } finally {
//             this.hideLoading();
//         }
//     }

//     updateUI() {
//         const storeName = document.getElementById('store-name');

//         if (storeName) {
//             storeName.textContent =
//                 this.restockData.store_name || 'Unknown Store';
//         }

//         const statusBadge = document.getElementById('status-badge');

//         if (statusBadge) {
//             statusBadge.innerHTML = `
//                 <span class="status-badge status-${this.restockData.status}">
//                     ${this.restockData.status}
//                 </span>
//             `;
//         }

//         const createdDate = document.getElementById('created-date');

//         if (createdDate) {
//             createdDate.textContent = new Date(
//                 this.restockData.generated_at
//             ).toLocaleString();
//         }

//         this.updateSummary();
//     }

//     updateSummary() {
//         let totalItems = this.items.length;
//         let totalQuantity = 0;
//         let totalValue = 0;

//         this.items.forEach(item => {
//             const quantity = Number(
//                 item.new_quantity ?? item.quantity_change ?? 0
//             );

//             const price = Number(
//                 item.new_price ?? item.current_price ?? 0
//             );

//             totalQuantity += quantity;
//             totalValue += quantity * price;
//         });

//         const totalItemsEl = document.getElementById('total-items');
//         if (totalItemsEl) {
//             totalItemsEl.textContent = totalItems;
//         }

//         const totalQuantityEl = document.getElementById('total-quantity');
//         if (totalQuantityEl) {
//             totalQuantityEl.textContent = totalQuantity;
//         }

//         const totalValueEl = document.getElementById('total-value');
//         if (totalValueEl) {
//             totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
//         }

//         const footerQty = document.getElementById('footer-total-qty');
//         if (footerQty) {
//             footerQty.textContent = totalQuantity;
//         }

//         const footerValue = document.getElementById('footer-total-value');
//         if (footerValue) {
//             footerValue.textContent = `$${totalValue.toFixed(2)}`;
//         }
//     }

//     renderItemsTable() {
//         const tbody = document.getElementById('products-table-body');
//         const footer = document.getElementById('products-table-footer');

//         if (!tbody) return;

//         if (!this.items || this.items.length === 0) {
//             tbody.innerHTML = `
//                 <tr>
//                     <td colspan="10" class="empty">
//                         No items in this restock
//                     </td>
//                 </tr>
//             `;

//             if (footer) {
//                 footer.style.display = 'none';
//             }

//             return;
//         }

//         if (footer) {
//             footer.style.display = 'table-footer-group';
//         }

//         tbody.innerHTML = this.items.map(item => {

//             const quantity = Number(
//                 item.new_quantity ?? item.quantity_change ?? 0
//             );

//             const price = Number(
//                 item.new_price ?? item.current_price ?? 0
//             );

//             const subtotal = quantity * price;

//             const isChecked = this.selectedItems.has(item.id);

//             return `
//                 <tr data-item-id="${item.id}">
//                     <td>
//                         <input
//                             type="checkbox"
//                             class="item-select"
//                             data-item-id="${item.id}"
//                             ${isChecked ? 'checked' : ''}
//                         >
//                     </td>

//                     <td>
//                         ${this.escapeHtml(item.product_sku || '-')}
//                     </td>

//                     <td>
//                         <strong>
//                             ${this.escapeHtml(item.product_name || '-')}
//                         </strong>
//                     </td>

//                     <td>
//                         ${this.escapeHtml(
//                             item.product_category || 'Uncategorized'
//                         )}
//                     </td>

//                     <td>
//                         ${item.current_quantity ?? 0}
//                     </td>

//                     <td>
//                         $${Number(item.current_price ?? 0).toFixed(2)}
//                     </td>

//                     <td>
//                         <input
//                             type="number"
//                             class="quantity-input"
//                             data-item-id="${item.id}"
//                             value="${quantity}"
//                             min="1"
//                             step="1"
//                         >
//                     </td>

//                     <td>
//                         <input
//                             type="number"
//                             class="price-input"
//                             data-item-id="${item.id}"
//                             value="${price}"
//                             min="0"
//                             step="0.01"
//                         >
//                     </td>

//                     <td
//                         class="subtotal"
//                         data-item-id="${item.id}"
//                     >
//                         $${subtotal.toFixed(2)}
//                     </td>

//                     <td>
//                         <button
//                             class="btn-danger remove-item"
//                             data-item-id="${item.id}"
//                         >
//                             Remove
//                         </button>
//                     </td>
//                 </tr>
//             `;
//         }).join('');

//         document.querySelectorAll('.item-select').forEach(cb => {
//             cb.addEventListener('change', (e) => {
//                 this.toggleItemSelection(e);
//             });
//         });

//         document.querySelectorAll('.quantity-input').forEach(input => {
//             input.addEventListener('change', (e) => {
//                 this.updateItemQuantity(e);
//             });
//         });

//         document.querySelectorAll('.price-input').forEach(input => {
//             input.addEventListener('change', (e) => {
//                 this.updateItemPrice(e);
//             });
//         });

//         document.querySelectorAll('.remove-item').forEach(btn => {
//             btn.addEventListener('click', (e) => {
//                 this.removeItem(e);
//             });
//         });
//     }

//     toggleItemSelection(event) {
//         const checkbox = event.target;
//         const itemId = parseInt(checkbox.dataset.itemId);

//         if (checkbox.checked) {
//             this.selectedItems.add(itemId);
//         } else {
//             this.selectedItems.delete(itemId);
//         }

//         this.updateSelectAllCheckbox();
//     }

//     toggleSelectAll(checked) {
//         if (checked) {
//             this.items.forEach(item => {
//                 this.selectedItems.add(item.id);
//             });
//         } else {
//             this.selectedItems.clear();
//         }

//         document.querySelectorAll('.item-select').forEach(cb => {
//             cb.checked = checked;
//         });
//     }

//     updateSelectAllCheckbox() {
//         const selectAll = document.getElementById('select-all-items');

//         if (selectAll) {
//             selectAll.checked =
//                 this.selectedItems.size === this.items.length;
//         }
//     }

//     async updateItemQuantity(event) {
//         const input = event.target;
//         const itemId = parseInt(input.dataset.itemId);

//         let newQuantity = parseInt(input.value);

//         if (isNaN(newQuantity) || newQuantity < 1) {
//             newQuantity = 1;
//             input.value = 1;
//         }

//         const item = this.items.find(i => i.id === itemId);

//         if (!item) return;

//         const newPrice = Number(
//             item.new_price ?? item.current_price ?? 0
//         );

//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/update_item/`,
//                 {
//                     method: 'PATCH',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'X-CSRFToken': this.getCookie('csrftoken')
//                     },
//                     body: JSON.stringify({
//                         item_id: itemId,
//                         new_quantity: newQuantity,
//                         new_price: newPrice
//                     })
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error('Failed to update quantity');
//             }

//             const updatedItem = await response.json();

//             const index = this.items.findIndex(i => i.id === itemId);

//             if (index !== -1) {
//                 this.items[index] = updatedItem;
//             }

//             this.renderItemsTable();
//             this.updateSummary();

//         } catch (error) {
//             console.error('Error updating quantity:', error);
//             this.showError(error.message);
//         }
//     }

//     async updateItemPrice(event) {
//         const input = event.target;
//         const itemId = parseInt(input.dataset.itemId);

//         let newPrice = parseFloat(input.value);

//         if (isNaN(newPrice) || newPrice < 0) {
//             newPrice = 0;
//             input.value = 0;
//         }

//         const item = this.items.find(i => i.id === itemId);

//         if (!item) return;

//         const newQuantity = Number(
//             item.new_quantity ?? item.quantity_change ?? 0
//         );

//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/update_item/`,
//                 {
//                     method: 'PATCH',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'X-CSRFToken': this.getCookie('csrftoken')
//                     },
//                     body: JSON.stringify({
//                         item_id: itemId,
//                         new_quantity: newQuantity,
//                         new_price: newPrice
//                     })
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error('Failed to update price');
//             }

//             const updatedItem = await response.json();

//             const index = this.items.findIndex(i => i.id === itemId);

//             if (index !== -1) {
//                 this.items[index] = updatedItem;
//             }

//             this.renderItemsTable();
//             this.updateSummary();

//         } catch (error) {
//             console.error('Error updating price:', error);
//             this.showError(error.message);
//         }
//     }

//     async removeItem(event) {
//         const btn = event.target;
//         const itemId = parseInt(btn.dataset.itemId);

//         if (!confirm('Are you sure you want to remove this item?')) {
//             return;
//         }

//         this.showLoading();

//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/remove_item/`,
//                 {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'X-CSRFToken': this.getCookie('csrftoken')
//                     },
//                     body: JSON.stringify({
//                         item_id: itemId
//                     })
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error('Failed to remove item');
//             }

//             await this.loadRestockData();

//         } catch (error) {
//             console.error('Error removing item:', error);
//             this.showError(error.message);

//         } finally {
//             this.hideLoading();
//         }
//     }

//     async saveChanges() {
//         this.showLoading();

//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/save_changes/`,
//                 {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'X-CSRFToken': this.getCookie('csrftoken')
//                     },
//                     body: JSON.stringify({
//                         items: this.items
//                     })
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error('Failed to save changes');
//             }

//             this.showSuccess('Changes saved successfully');
//             await this.loadRestockData();

//         } catch (error) {
//             console.error('Error saving changes:', error);
//             this.showError(error.message);
//         } finally {
//             this.hideLoading();
//         }
//     }

//     continueToReview() {
//         window.location.href =
//             `/inventory/workflow-bulk-restocks/${this.restockId}/review/`;
//     }

//     openAddProductsModal() {
//         const modal = document.getElementById('add-products-modal');
//         if (!modal) {
//             console.error('Add products modal not found');
//             return;
//         }
        
//         // Reset filters and pagination
//         this.currentPage = 1;
        
//         // Load category filter options
//         this.loadCategoryFilters();
        
//         // Load available products
//         this.loadAvailableProducts();
        
//         // Show modal
//         modal.style.display = 'flex';
        
//         // Bind modal close events
//         const closeBtn = modal.querySelector('.modal-close');
//         const cancelBtn = document.getElementById('cancel-add-products');
        
//         const closeModal = () => {
//             modal.style.display = 'none';
//             if (closeBtn) closeBtn.removeEventListener('click', closeModal);
//             if (cancelBtn) cancelBtn.removeEventListener('click', closeModal);
//         };
        
//         if (closeBtn) {
//             closeBtn.addEventListener('click', closeModal);
//         }
        
//         if (cancelBtn) {
//             cancelBtn.addEventListener('click', closeModal);
//         }
        
//         // Close modal when clicking outside
//         modal.addEventListener('click', (e) => {
//             if (e.target === modal) {
//                 closeModal();
//             }
//         });
        
//         // Bind filter button
//         const applyFiltersBtn = document.getElementById('modal-apply-filters');
//         if (applyFiltersBtn) {
//             applyFiltersBtn.onclick = () => {
//                 this.currentPage = 1;
//                 this.loadAvailableProducts();
//             };
//         }
        
//         // Bind add selected button
//         const addSelectedBtn = document.getElementById('add-selected-products');
//         if (addSelectedBtn) {
//             addSelectedBtn.onclick = () => this.addSelectedProducts();
//         }
        
//         // Bind search on enter key
//         const searchInput = document.getElementById('modal-filter-search');
//         if (searchInput) {
//             searchInput.onkeypress = (e) => {
//                 if (e.key === 'Enter') {
//                     this.currentPage = 1;
//                     this.loadAvailableProducts();
//                 }
//             };
//         }
//     }

//     async loadCategoryFilters() {
//         try {
//             const response = await fetch('/inventory/categories/');
//             const categories = await response.json();
            
//             const categorySelect = document.getElementById('modal-filter-category');
//             if (categorySelect) {
//                 categorySelect.innerHTML = '<option value="">All Categories</option>' +
//                     categories.map(cat => `<option value="${cat.id}">${this.escapeHtml(cat.name)}</option>`).join('');
//             }
//         } catch (error) {
//             console.error('Error loading categories:', error);
//         }
//     }

//     async loadAvailableProducts() {
//         const category = document.getElementById('modal-filter-category')?.value || '';
//         const stockStatus = document.getElementById('modal-filter-stock-status')?.value || 'all';
//         const search = document.getElementById('modal-filter-search')?.value || '';
        
//         const container = document.getElementById('modal-products-list');
//         if (container) {
//             container.innerHTML = '<div class="loading">Loading products...</div>';
//         }
        
//         try {
//             const params = new URLSearchParams({
//                 page: this.currentPage,
//                 category: category,
//                 stock_status: stockStatus,
//                 search: search,
//                 exclude_restock_id: this.restockId
//             });
            
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/available-products/?${params}`,
//                 {
//                     headers: { 'Accept': 'application/json' }
//                 }
//             );
            
//             if (!response.ok) {
//                 throw new Error('Failed to load products');
//             }
            
//             const data = await response.json();
//             this.availableProducts = data.products || [];
//             this.totalPages = data.total_pages || 1;
            
//             this.renderAvailableProducts();
//             this.renderPagination();
            
//         } catch (error) {
//             console.error('Error loading products:', error);
//             if (container) {
//                 container.innerHTML = '<div class="error">Failed to load products</div>';
//             }
//             this.showError('Failed to load products');
//         }
//     }

//     renderAvailableProducts() {
//         const container = document.getElementById('modal-products-list');
//         if (!container) return;
        
//         if (!this.availableProducts.length) {
//             container.innerHTML = '<div class="empty">No products available to add</div>';
//             return;
//         }
        
//         container.innerHTML = `
//             <table class="data-table">
//                 <thead>
//                     <tr>
//                         <th width="50"><input type="checkbox" id="modal-select-all"></th>
//                         <th>SKU</th>
//                         <th>Product Name</th>
//                         <th>Category</th>
//                         <th>Current Stock</th>
//                         <th>Current Price</th>
//                         <th width="120">Quantity to Add</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${this.availableProducts.map(product => `
//                         <tr data-product-id="${product.id}">
//                             <td>
//                                 <input type="checkbox" class="modal-product-select" 
//                                        data-product-id="${product.id}">
//                             </td>
//                             <td>${this.escapeHtml(product.sku || '-')}</td>
//                             <td><strong>${this.escapeHtml(product.name)}</strong></td>
//                             <td>${this.escapeHtml(product.category || 'Uncategorized')}</td>
//                             <td>${product.current_quantity || 0}</td>
//                             <td>$${Number(product.price || 0).toFixed(2)}</td>
//                             <td>
//                                 <input type="number" class="product-quantity" 
//                                        data-product-id="${product.id}"
//                                        value="1" min="1" step="1" style="width: 80px;">
//                             </td>
//                         </tr>
//                     `).join('')}
//                 </tbody>
//             </table>
//         `;
        
//         // Bind select all
//         const selectAll = document.getElementById('modal-select-all');
//         if (selectAll) {
//             selectAll.onchange = (e) => {
//                 document.querySelectorAll('.modal-product-select').forEach(cb => {
//                     cb.checked = e.target.checked;
//                 });
//             };
//         }
        
//         // Bind quantity validation
//         document.querySelectorAll('.product-quantity').forEach(input => {
//             input.addEventListener('change', (e) => {
//                 let value = parseInt(e.target.value);
//                 if (isNaN(value) || value < 1) {
//                     e.target.value = 1;
//                 }
//             });
//         });
//     }

//     renderPagination() {
//         const container = document.getElementById('modal-pagination');
//         if (!container) return;
        
//         if (this.totalPages <= 1) {
//             container.innerHTML = '';
//             return;
//         }
        
//         let html = '<div class="pagination">';
        
//         // Previous button
//         if (this.currentPage > 1) {
//             html += `<button class="page-btn" data-page="${this.currentPage - 1}">← Previous</button>`;
//         }
        
//         // Page numbers
//         for (let i = 1; i <= this.totalPages; i++) {
//             if (i === 1 || i === this.totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
//                 html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
//                                 data-page="${i}">${i}</button>`;
//             } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
//                 html += '<span class="page-dots">...</span>';
//             }
//         }
        
//         // Next button
//         if (this.currentPage < this.totalPages) {
//             html += `<button class="page-btn" data-page="${this.currentPage + 1}">Next →</button>`;
//         }
        
//         html += '</div>';
//         container.innerHTML = html;
        
//         // Bind click events
//         container.querySelectorAll('.page-btn').forEach(btn => {
//             btn.onclick = () => {
//                 this.currentPage = parseInt(btn.dataset.page);
//                 this.loadAvailableProducts();
//             };
//         });
//     }

//     async addSelectedProducts() {
//         const selectedProducts = [];
        
//         document.querySelectorAll('.modal-product-select:checked').forEach(checkbox => {
//             const row = checkbox.closest('tr');
//             const productId = parseInt(checkbox.dataset.productId);
//             const quantityInput = row.querySelector('.product-quantity');
//             const quantity = parseInt(quantityInput ? quantityInput.value : 1);
            
//             selectedProducts.push({
//                 product_id: productId,
//                 quantity: quantity
//             });
//         });
        
//         if (selectedProducts.length === 0) {
//             this.showError('Please select at least one product');
//             return;
//         }
        
//         this.showLoading();
        
//         try {
//             const response = await fetch(
//                 `/inventory/workflow-bulk-restocks/${this.restockId}/add_items/`,
//                 {
//                     method: 'POST',
//                     headers: {
//                         'Content-Type': 'application/json',
//                         'X-CSRFToken': this.getCookie('csrftoken')
//                     },
//                     body: JSON.stringify({ items: selectedProducts })
//                 }
//             );
            
//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || 'Failed to add products');
//             }
            
//             await this.loadRestockData();
            
//             // Close modal
//             const modal = document.getElementById('add-products-modal');
//             if (modal) {
//                 modal.style.display = 'none';
//             }
            
//             this.showSuccess(`${selectedProducts.length} product(s) added successfully`);
            
//         } catch (error) {
//             console.error('Error adding products:', error);
//             this.showError(error.message);
//         } finally {
//             this.hideLoading();
//         }
//     }

//     openBulkUpdateModal() {
//         const modal = document.getElementById('bulk-update-modal');
//         if (!modal) {
//             console.error('Bulk update modal not found');
//             return;
//         }
        
//         if (this.selectedItems.size === 0) {
//             this.showError('Please select at least one item to update');
//             return;
//         }
        
//         // Reset form
//         const bulkAction = document.getElementById('bulk-action');
//         const bulkValue = document.getElementById('bulk-value');
        
//         if (bulkAction) bulkAction.value = 'quantity';
//         if (bulkValue) bulkValue.value = '';
        
//         // Show modal
//         modal.style.display = 'flex';
        
//         // Bind close events
//         const closeBtn = modal.querySelector('.modal-close');
//         const cancelBtn = document.getElementById('cancel-bulk-update');
//         const applyBtn = document.getElementById('apply-bulk-update');
        
//         const closeModal = () => {
//             modal.style.display = 'none';
//             if (closeBtn) closeBtn.removeEventListener('click', closeModal);
//             if (cancelBtn) cancelBtn.removeEventListener('click', closeModal);
//         };
        
//         if (closeBtn) {
//             closeBtn.addEventListener('click', closeModal);
//         }
        
//         if (cancelBtn) {
//             cancelBtn.addEventListener('click', closeModal);
//         }
        
//         // Close when clicking outside
//         modal.addEventListener('click', (e) => {
//             if (e.target === modal) {
//                 closeModal();
//             }
//         });
        
//         // Apply bulk update
//         if (applyBtn) {
//             applyBtn.onclick = () => this.applyBulkUpdate();
//         }
//     }

//     async applyBulkUpdate() {
//         const action = document.getElementById('bulk-action')?.value;
//         const valueInput = document.getElementById('bulk-value');
//         const value = parseFloat(valueInput?.value);
        
//         if (isNaN(value) || value < 0) {
//             this.showError('Please enter a valid value');
//             return;
//         }
        
//         if (this.selectedItems.size === 0) {
//             this.showError('No items selected');
//             return;
//         }
        
//         this.showLoading();
        
//         try {
//             const updates = [];
            
//             for (const itemId of this.selectedItems) {
//                 const item = this.items.find(i => i.id === itemId);
//                 if (!item) continue;
                
//                 let newQuantity = Number(item.new_quantity ?? item.quantity_change ?? 0);
//                 let newPrice = Number(item.new_price ?? item.current_price ?? 0);
                
//                 switch(action) {
//                     case 'quantity':
//                         newQuantity = value;
//                         break;
//                     case 'price':
//                         newPrice = value;
//                         break;
//                     case 'increase_quantity':
//                         newQuantity += value;
//                         break;
//                     case 'decrease_quantity':
//                         newQuantity = Math.max(0, newQuantity - value);
//                         break;
//                     default:
//                         continue;
//                 }
                
//                 updates.push(
//                     fetch(`/inventory/workflow-bulk-restocks/${this.restockId}/update_item/`, {
//                         method: 'PATCH',
//                         headers: {
//                             'Content-Type': 'application/json',
//                             'X-CSRFToken': this.getCookie('csrftoken')
//                         },
//                         body: JSON.stringify({ 
//                             item_id: itemId, 
//                             new_quantity: Math.max(1, newQuantity), 
//                             new_price: Math.max(0, newPrice) 
//                         })
//                     })
//                 );
//             }
            
//             await Promise.all(updates);
            
//             // Reload data
//             await this.loadRestockData();
            
//             // Close modal
//             const modal = document.getElementById('bulk-update-modal');
//             if (modal) {
//                 modal.style.display = 'none';
//             }
            
//             this.showSuccess(`Bulk update applied to ${this.selectedItems.size} item(s)`);
            
//         } catch (error) {
//             console.error('Bulk update error:', error);
//             this.showError('Failed to apply bulk update');
//         } finally {
//             this.hideLoading();
//         }
//     }

//     getCookie(name) {
//         let cookieValue = null;

//         if (document.cookie && document.cookie !== '') {
//             const cookies = document.cookie.split(';');

//             for (let i = 0; i < cookies.length; i++) {
//                 const cookie = cookies[i].trim();

//                 if (
//                     cookie.substring(0, name.length + 1) ===
//                     (name + '=')
//                 ) {
//                     cookieValue = decodeURIComponent(
//                         cookie.substring(name.length + 1)
//                     );

//                     break;
//                 }
//             }
//         }

//         return cookieValue;
//     }

//     escapeHtml(text) {
//         if (!text) return '';

//         const div = document.createElement('div');
//         div.textContent = text;

//         return div.innerHTML;
//     }

//     showLoading() {
//         const overlay = document.getElementById('loading-overlay');

//         if (overlay) {
//             overlay.style.display = 'flex';
//         }
//     }

//     hideLoading() {
//         const overlay = document.getElementById('loading-overlay');

//         if (overlay) {
//             overlay.style.display = 'none';
//         }
//     }

//     showSuccess(message) {
//         // You can replace this with a toast notification system
//         alert(message);
//     }

//     showError(message) {
//         // You can replace this with a toast notification system
//         alert(message);
//     }
// }

// // Initialize when DOM is ready
// document.addEventListener('DOMContentLoaded', () => {
//     window.bulkRestockEdit = new BulkRestockEdit();
// });

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
        this.currentStoreId = null;
        this.pageSize = 20;

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

    // async loadRestockData() {
    //     this.showLoading();

    //     try {
    //         const response = await fetch(
    //             `/inventory/workflow-bulk-restocks/${this.restockId}/`,
    //             {
    //                 method: 'GET',
    //                 credentials: 'same-origin',
    //                 headers: {
    //                     'Accept': 'application/json'
    //                 }
    //             }
    //         );

    //         if (!response.ok) {
    //             throw new Error(`HTTP ${response.status}`);
    //         }

    //         const data = await response.json();

    //         console.log('Restock data:', data);

    //         this.restockData = data;
    //         this.items = data.items || [];
    //         this.currentStoreId = data.store_id; // Capture store ID from restock data

    //         this.updateUI();
    //         this.renderItemsTable();

    //     } catch (error) {
    //         console.error('Error loading restock:', error);
    //         this.showError(`Failed to load restock data: ${error.message}`);
    //     } finally {
    //         this.hideLoading();
    //     }
    // }

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

            console.log('Restock data (RAW RESPONSE):', data);

            this.restockData = data;
            this.items = data.items || [];

            // STORE DEBUG LOGS
            this.currentStoreId = data.store;

            console.log('STORE DEBUG:');
            console.log('data.store_id:', data.store);
            console.log('this.currentStoreId:', this.currentStoreId);

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

    async saveChanges() {
        this.showLoading();

        try {
            const response = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/save_changes/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        items: this.items
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Failed to save changes');
            }

            this.showSuccess('Changes saved successfully');
            await this.loadRestockData();

        } catch (error) {
            console.error('Error saving changes:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    continueToReview() {
        window.location.href =
            `/inventory/workflow-bulk-restocks/${this.restockId}/review/`;
    }

    async openAddProductsModal() {
        const modal = document.getElementById('add-products-modal');
        // this.currentStoreId = 1; // MOCK STORE ID

        if (!modal) {
            console.error('Add products modal not found');
            return;
        }
        console.log('STORE ID AT MODAL OPEN:', this.currentStoreId);
        if (!this.currentStoreId) {
            this.showError('Store information not available');
            return;
        }
        
        // Reset filters and pagination
        this.currentPage = 1;
        
        // Load category filter options
        await this.loadCategoryFilters();
        
        // Load available products
        await this.loadAvailableProducts();
        
        // Show modal
        modal.style.display = 'flex';
        
        // Bind modal close events
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-add-products');
        
        const closeModal = () => {
            modal.style.display = 'none';
            if (closeBtn) closeBtn.removeEventListener('click', closeModal);
            if (cancelBtn) cancelBtn.removeEventListener('click', closeModal);
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Bind filter button
        const applyFiltersBtn = document.getElementById('modal-apply-filters');
        if (applyFiltersBtn) {
            // Remove existing listener to avoid duplicates
            const newBtn = applyFiltersBtn.cloneNode(true);
            applyFiltersBtn.parentNode.replaceChild(newBtn, applyFiltersBtn);
            newBtn.addEventListener('click', () => {
                this.currentPage = 1;
                this.loadAvailableProducts();
            });
        }
        
        // Bind add selected button
        const addSelectedBtn = document.getElementById('add-selected-products');
        if (addSelectedBtn) {
            const newBtn = addSelectedBtn.cloneNode(true);
            addSelectedBtn.parentNode.replaceChild(newBtn, addSelectedBtn);
            newBtn.addEventListener('click', () => this.addSelectedProducts());
        }
        
        // Bind search on enter key
        const searchInput = document.getElementById('modal-filter-search');
        if (searchInput) {
            searchInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.currentPage = 1;
                    this.loadAvailableProducts();
                }
            };
        }
    }

    async loadCategoryFilters() {
        try {
            const response = await fetch('/inventory/categories/');
            const data = await response.json();
            
            const categorySelect = document.getElementById('modal-filter-category');
            if (categorySelect && data.results) {
                categorySelect.innerHTML = '<option value="">All Categories</option>';
                data.results.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async loadAvailableProducts() {
        if (!this.currentStoreId) {
            console.error('No store ID available');
            return;
        }
        
        const category = document.getElementById('modal-filter-category')?.value || '';
        const stockStatus = document.getElementById('modal-filter-stock-status')?.value || 'all';
        const search = document.getElementById('modal-filter-search')?.value || '';
        
        const container = document.getElementById('modal-products-list');
        if (container) {
            container.innerHTML = '<div class="loading">Loading products...</div>';
        }
        
        try {
            const params = new URLSearchParams({
                store_id: this.currentStoreId,
                page: this.currentPage,
                page_size: this.pageSize,
                search: search
            });
            
            // Add optional parameters only if they have values
            if (category) params.append('category_id', category);
            if (stockStatus && stockStatus !== 'all') params.append('stock_status', stockStatus);
            
            const response = await fetch(
                `/inventory/workflow-bulk-restocks/available_products/?${params.toString()}`,
                {
                    headers: { 'Accept': 'application/json' }
                }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle different response formats
            if (data.products) {
                this.availableProducts = data.products;
                this.totalPages = data.pagination?.total_pages || 1;
            } else if (data.results) {
                this.availableProducts = data.results;
                this.totalPages = Math.ceil(data.count / this.pageSize) || 1;
            } else {
                this.availableProducts = [];
                this.totalPages = 1;
            }
            
            this.renderAvailableProducts();
            this.renderPagination();
            
        } catch (error) {
            console.error('Error loading products:', error);
            if (container) {
                container.innerHTML = '<div class="error">Failed to load products. Please try again.</div>';
            }
            this.showError('Failed to load products');
        }
    }

    renderAvailableProducts() {
        const container = document.getElementById('modal-products-list');
        if (!container) return;
        
        if (!this.availableProducts.length) {
            container.innerHTML = '<div class="empty">No products available to add</div>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th width="50"><input type="checkbox" id="modal-select-all"></th>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Current Stock</th>
                        <th>Stock Status</th>
                        <th>Current Price</th>
                        <th width="120">Quantity to Add</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.availableProducts.map(product => `
                        <tr data-product-id="${product.id}">
                            <td>
                                <input type="checkbox" class="modal-product-select" 
                                       data-product-id="${product.id}">
                            </td>
                            <td>${this.escapeHtml(product.sku || '-')}</td>
                            <td><strong>${this.escapeHtml(product.name)}</strong></td>
                            <td>${this.escapeHtml(product.category || 'Uncategorized')}</td>
                            <td>${product.current_stock ?? product.current_quantity ?? 0}</td>
                            <td>${this.getStockStatusBadge(product.stock_status)}</td>
                            <td>$${Number(product.selling_price ?? product.price ?? 0).toFixed(2)}</td>
                            <td>
                                <input type="number" class="product-quantity" 
                                       data-product-id="${product.id}"
                                       value="${product.reorder_level || 1}" 
                                       min="1" step="1" style="width: 80px;">
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        // Bind select all
        const selectAll = document.getElementById('modal-select-all');
        if (selectAll) {
            selectAll.onchange = (e) => {
                document.querySelectorAll('.modal-product-select').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            };
        }
        
        // Bind quantity validation
        document.querySelectorAll('.product-quantity').forEach(input => {
            input.addEventListener('change', (e) => {
                let value = parseInt(e.target.value);
                if (isNaN(value) || value < 1) {
                    e.target.value = 1;
                }
            });
        });
    }

    getStockStatusBadge(status) {
        const badges = {
            'low_stock': '<span class="stock-badge stock-low">Low Stock</span>',
            'out_of_stock': '<span class="stock-badge stock-out">Out of Stock</span>',
            'in_stock': '<span class="stock-badge stock-in">In Stock</span>'
        };
        return badges[status] || '<span class="stock-badge">Unknown</span>';
    }

    renderPagination() {
        const container = document.getElementById('modal-pagination');
        if (!container) return;
        
        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination">';
        
        // Previous button
        if (this.currentPage > 1) {
            html += `<button class="page-btn" data-page="${this.currentPage - 1}">← Previous</button>`;
        }
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            html += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) html += '<span class="page-dots">...</span>';
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            data-page="${i}">${i}</button>`;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) html += '<span class="page-dots">...</span>';
            html += `<button class="page-btn" data-page="${this.totalPages}">${this.totalPages}</button>`;
        }
        
        // Next button
        if (this.currentPage < this.totalPages) {
            html += `<button class="page-btn" data-page="${this.currentPage + 1}">Next →</button>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
        
        // Bind click events
        container.querySelectorAll('.page-btn').forEach(btn => {
            btn.onclick = () => {
                this.currentPage = parseInt(btn.dataset.page);
                this.loadAvailableProducts();
            };
        });
    }

    // async addSelectedProducts() {
    //     const selectedProducts = [];
        
    //     document.querySelectorAll('.modal-product-select:checked').forEach(checkbox => {
    //         const row = checkbox.closest('tr');
    //         const productId = parseInt(checkbox.dataset.productId);
    //         const quantityInput = row.querySelector('.product-quantity');
    //         const quantity = parseInt(quantityInput ? quantityInput.value : 1);
            
    //         // Find the product data to get its price
    //         const product = this.availableProducts.find(p => p.id === productId);
            
    //         if (product) {
    //             selectedProducts.push({
    //                 product_id: productId,
    //                 quantity: quantity,
    //                 price: product.selling_price ?? product.price ?? 0
    //             });
    //         }
    //     });
        
    //     if (selectedProducts.length === 0) {
    //         this.showError('Please select at least one product');
    //         return;
    //     }
        
    //     this.showLoading();
        
    //     try {
    //         const response = await fetch(
    //             `/inventory/workflow-bulk-restocks/${this.restockId}/add_items/`,
    //             {
    //                 method: 'POST',
    //                 headers: {
    //                     'Content-Type': 'application/json',
    //                     'X-CSRFToken': this.getCookie('csrftoken')
    //                 },
    //                 body: JSON.stringify({ items: selectedProducts })
    //             }
    //         );
            
    //         if (!response.ok) {
    //             const errorData = await response.json();
    //             throw new Error(errorData.error || 'Failed to add products');
    //         }
            
    //         await this.loadRestockData();
            
    //         // Close modal
    //         const modal = document.getElementById('add-products-modal');
    //         if (modal) {
    //             modal.style.display = 'none';
    //         }
            
    //         this.showSuccess(`${selectedProducts.length} product(s) added successfully`);
            
    //     } catch (error) {
    //         console.error('Error adding products:', error);
    //         this.showError(error.message);
    //     } finally {
    //         this.hideLoading();
    //     }
    // }
    async addSelectedProducts() {
        console.log('--- addSelectedProducts START ---');

        const selectedProducts = [];

        const checkedBoxes = document.querySelectorAll('.modal-product-select:checked');
        console.log('Checked products count:', checkedBoxes.length);

        document.querySelectorAll('.modal-product-select:checked').forEach(checkbox => {
            const row = checkbox.closest('tr');

            const productId = parseInt(checkbox.dataset.productId);
            const quantityInput = row?.querySelector('.product-quantity');
            const quantity = parseInt(quantityInput ? quantityInput.value : 1);

            const product = this.availableProducts.find(p => p.id === productId);

            console.log('Processing product:', {
                productId,
                quantity,
                foundInAvailableProducts: !!product
            });

            if (product) {
                const item = {
                    product_id: productId,
                    quantity: quantity,
                    price: product.selling_price ?? product.price ?? 0
                };

                console.log('PUSHING ITEM:', item);

                selectedProducts.push(item);
            } else {
                console.warn('Product NOT found in availableProducts:', productId);
            }
        });

        console.log('Final selectedProducts payload:', selectedProducts);

        if (selectedProducts.length === 0) {
            console.warn('No products selected - stopping execution');
            this.showError('Please select at least one product');
            return;
        }

        this.showLoading();

        try {
            console.log('Sending request to add_items API...');
            console.log('Request body:', JSON.stringify({ items: selectedProducts }, null, 2));

            const response = await fetch(
                `/inventory/workflow-bulk-restocks/${this.restockId}/add_items/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': this.getCookie('csrftoken')
                    },
                    body: JSON.stringify({ items: selectedProducts })
                }
            );

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API ERROR RESPONSE:', errorData);
                throw new Error(errorData.error || 'Failed to add products');
            }

            const result = await response.json();
            console.log('SUCCESS RESPONSE:', result);

            await this.loadRestockData();

            const modal = document.getElementById('add-products-modal');
            if (modal) {
                modal.style.display = 'none';
            }

            console.log('Modal closed, data reloaded');

            this.showSuccess(`${selectedProducts.length} product(s) added successfully`);

        } catch (error) {
            console.error('Error adding products:', error);
            this.showError(error.message);
        } finally {
            console.log('--- addSelectedProducts END ---');
            this.hideLoading();
        }
    }

    openBulkUpdateModal() {
        const modal = document.getElementById('bulk-update-modal');
        if (!modal) {
            console.error('Bulk update modal not found');
            return;
        }
        
        if (this.selectedItems.size === 0) {
            this.showError('Please select at least one item to update');
            return;
        }
        
        // Update selected count display
        const selectedCountSpan = document.getElementById('selected-count');
        if (selectedCountSpan) {
            selectedCountSpan.textContent = this.selectedItems.size;
        }
        
        // Reset form
        const bulkAction = document.getElementById('bulk-action');
        const bulkValue = document.getElementById('bulk-value');
        
        if (bulkAction) bulkAction.value = 'quantity';
        if (bulkValue) bulkValue.value = '';
        
        // Show modal
        modal.style.display = 'flex';
        
        // Bind close events
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-bulk-update');
        const applyBtn = document.getElementById('apply-bulk-update');
        
        const closeModal = () => {
            modal.style.display = 'none';
            if (closeBtn) closeBtn.removeEventListener('click', closeModal);
            if (cancelBtn) cancelBtn.removeEventListener('click', closeModal);
        };
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', closeModal);
        }
        
        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Apply bulk update
        if (applyBtn) {
            // Remove existing listener to avoid duplicates
            const newBtn = applyBtn.cloneNode(true);
            applyBtn.parentNode.replaceChild(newBtn, applyBtn);
            newBtn.addEventListener('click', () => this.applyBulkUpdate());
        }
    }

    async applyBulkUpdate() {
        const action = document.getElementById('bulk-action')?.value;
        const valueInput = document.getElementById('bulk-value');
        const value = parseFloat(valueInput?.value);
        
        if (isNaN(value) || value < 0) {
            this.showError('Please enter a valid value');
            return;
        }
        
        if (this.selectedItems.size === 0) {
            this.showError('No items selected');
            return;
        }
        
        this.showLoading();
        
        try {
            const updates = [];
            
            for (const itemId of this.selectedItems) {
                const item = this.items.find(i => i.id === itemId);
                if (!item) continue;
                
                let newQuantity = Number(item.new_quantity ?? item.quantity_change ?? 0);
                let newPrice = Number(item.new_price ?? item.current_price ?? 0);
                
                switch(action) {
                    case 'quantity':
                        newQuantity = value;
                        break;
                    case 'price':
                        newPrice = value;
                        break;
                    case 'increase_quantity':
                        newQuantity += value;
                        break;
                    case 'decrease_quantity':
                        newQuantity = Math.max(1, newQuantity - value);
                        break;
                    default:
                        continue;
                }
                
                updates.push(
                    fetch(`/inventory/workflow-bulk-restocks/${this.restockId}/update_item/`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': this.getCookie('csrftoken')
                        },
                        body: JSON.stringify({ 
                            item_id: itemId, 
                            new_quantity: Math.max(1, newQuantity), 
                            new_price: Math.max(0, newPrice) 
                        })
                    })
                );
            }
            
            await Promise.all(updates);
            
            // Reload data
            await this.loadRestockData();
            
            // Clear selected items after bulk update
            this.selectedItems.clear();
            this.updateSelectAllCheckbox();
            
            // Close modal
            const modal = document.getElementById('bulk-update-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            this.showSuccess(`Bulk update applied to ${updates.length} item(s)`);
            
        } catch (error) {
            console.error('Bulk update error:', error);
            this.showError('Failed to apply bulk update');
        } finally {
            this.hideLoading();
        }
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
        // You can replace this with a toast notification system
        alert(message);
    }

    showError(message) {
        // You can replace this with a toast notification system
        alert(message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.bulkRestockEdit = new BulkRestockEdit();
});