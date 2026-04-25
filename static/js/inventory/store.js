/* ============================================================
    STORE MANAGEMENT MODULE
============================================================ */

const STORES_CONFIG = {
    API_ENDPOINTS: {
        STORES: '/inventory/stores/',
        STORE_DETAIL: (id) => `/inventory/stores/${id}/`,
    },

    SELECTORS: {
        // Modal selectors
        MODAL: '#store-modal',
        MODAL_TITLE: '#store-modal-title',
        MODAL_SUBMIT: '#store-submit',
        MODAL_CANCEL: '#store-cancel',
        
        // Form field selectors
        STORE_NAME: '#store-name',
        STORE_LOCATION: '#store-location',
        STORE_TYPE: '#store-type',
        STORE_DEFAULT_WAREHOUSE: '#store-is-default-warehouse',
        STORE_ACTIVE: '#store-is-active',
        
        // Add store button (in header)
        ADD_BUTTON: '#open-store-form-btn',
        
        // Error display
        ERROR_DIV: '#store-error',
        
        // Store list
        STORE_LIST: '#store-list',
        
        // Stats
        TOTAL_STORES: '#total-stores',
        RETAIL_STORES: '#retail-stores',
        WAREHOUSE_STORES: '#warehouse-stores',
    },

    MESSAGES: {
        LOADING: 'Loading stores...',
        SAVING: 'Saving store...',
        DELETING: 'Deleting store...',
        SUCCESS_ADD: 'Store added successfully',
        SUCCESS_UPDATE: 'Store updated successfully',
        SUCCESS_DELETE: 'Store deleted successfully',
        ERROR_FETCH: 'Error fetching stores',
        ERROR_SAVE: 'Error saving store',
        ERROR_DELETE: 'Error deleting store',

        VALIDATION: {
            NAME_REQUIRED: 'Store name is required',
            TYPE_REQUIRED: 'Please select a store type',
        }
    }
};

class StoreState {
    constructor() {
        this.stores = [];
        this.editId = null;
        this.isLoading = false;
        this.csrfToken = this.getCSRFToken();
    }

    getCSRFToken() {
        const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
        return input ? input.value : null;
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        const btn = document.querySelector(STORES_CONFIG.SELECTORS.MODAL_SUBMIT);
        if (btn) {
            btn.disabled = isLoading;
            btn.textContent = isLoading
                ? "Saving..."
                : (this.editId ? "Update Store" : "Save Store");
        }
    }

    setEditMode(store) {
        this.editId = store.id;
        this.updateForm(store);
    }

    clearEditMode() {
        this.editId = null;
        this.resetForm();
    }

    updateForm(store) {
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_NAME).value = store.name || '';
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_LOCATION).value = store.location || '';
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_TYPE).value = store.store_type || '';
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_DEFAULT_WAREHOUSE).checked = store.is_default_warehouse || false;
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_ACTIVE).checked = store.is_active !== false;

        // Show/hide warehouse checkbox
        const warehouseCheckboxGroup = document.getElementById('warehouse-checkbox-group');
        if (store.store_type === 'WAREHOUSE') {
            warehouseCheckboxGroup.style.display = 'block';
        } else {
            warehouseCheckboxGroup.style.display = 'none';
        }

        // Update modal title
        document.querySelector(STORES_CONFIG.SELECTORS.MODAL_TITLE).textContent = "Edit Store";
    }

    resetForm() {
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_NAME).value = "";
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_LOCATION).value = "";
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_TYPE).value = "";
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_DEFAULT_WAREHOUSE).checked = false;
        document.querySelector(STORES_CONFIG.SELECTORS.STORE_ACTIVE).checked = true;

        // Hide warehouse checkbox
        const warehouseCheckboxGroup = document.getElementById('warehouse-checkbox-group');
        warehouseCheckboxGroup.style.display = 'none';

        // Reset modal title
        document.querySelector(STORES_CONFIG.SELECTORS.MODAL_TITLE).textContent = "Add Store";
    }

    openModal() {
        document.querySelector(STORES_CONFIG.SELECTORS.MODAL).style.display = 'block';
        this.showBackdrop();
    }

    closeModal() {
        document.querySelector(STORES_CONFIG.SELECTORS.MODAL).style.display = 'none';
        this.hideBackdrop();
        this.clearEditMode();
        StoreUtils.hideError();
    }

    showBackdrop() {
        let backdrop = document.querySelector('.modal-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            backdrop.addEventListener('click', () => this.closeModal());
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

class StoreUtils {
    static showError(message) {
        const div = document.querySelector(STORES_CONFIG.SELECTORS.ERROR_DIV);
        if (div) {
            div.textContent = message;
            div.style.display = 'block';
        }
    }

    static hideError() {
        const div = document.querySelector(STORES_CONFIG.SELECTORS.ERROR_DIV);
        if (div) {
            div.style.display = 'none';
        }
    }

    static showSuccess(message) {
        const box = document.createElement('div');
        box.textContent = message;
        box.style.cssText = `
            position: fixed; top:20px; right:20px;
            background:#28a745; color:white;
            padding:12px 20px; border-radius:4px;
            z-index:2000; box-shadow:0 2px 10px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(box);
        setTimeout(() => box.remove(), 3000);
    }

    static validate(data) {
        StoreUtils.hideError();

        if (!data.name || !data.name.trim()) {
            StoreUtils.showError(STORES_CONFIG.MESSAGES.VALIDATION.NAME_REQUIRED);
            return false;
        }
        if (!data.store_type) {
            StoreUtils.showError(STORES_CONFIG.MESSAGES.VALIDATION.TYPE_REQUIRED);
            return false;
        }
        return true;
    }

    static escape(text) {
        if (!text) return '';
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    static formatStoreType(type) {
        switch(type) {
            case 'WAREHOUSE': return 'Warehouse';
            case 'RETAIL': return 'Retail Store';
            default: return type || 'Unknown';
        }
    }
}

class StoreAPI {
    async list() {
        const res = await fetch(STORES_CONFIG.API_ENDPOINTS.STORES);
        if (!res.ok) throw new Error(STORES_CONFIG.MESSAGES.ERROR_FETCH);
        return await res.json();
    }

    async create(data) {
        const res = await fetch(STORES_CONFIG.API_ENDPOINTS.STORES, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": window.storeState.csrfToken
            },
            body: JSON.stringify(data)
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.detail || STORES_CONFIG.MESSAGES.ERROR_SAVE);
        return json;
    }

    async update(id, data) {
        const res = await fetch(STORES_CONFIG.API_ENDPOINTS.STORE_DETAIL(id), {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": window.storeState.csrfToken
            },
            body: JSON.stringify(data)
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || json.detail || STORES_CONFIG.MESSAGES.ERROR_SAVE);
        return json;
    }

    async delete(id) {
        const res = await fetch(STORES_CONFIG.API_ENDPOINTS.STORE_DETAIL(id), {
            method: "DELETE",
            headers: { "X-CSRFToken": window.storeState.csrfToken }
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.detail || error.error || STORES_CONFIG.MESSAGES.ERROR_DELETE);
        }
    }
}

class StoreUI {
    static renderList(stores) {
        const tbody = document.querySelector(STORES_CONFIG.SELECTORS.STORE_LIST);
        if (!tbody) return;

        tbody.innerHTML = "";

        if (stores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="padding:40px; text-align:center;">No stores found. Click "Add Store" to create your first store.</td></tr>`;
        } else {
            stores.forEach(store => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${StoreUtils.escape(store.name)}</strong></td>
                    <td>${StoreUtils.escape(store.location || '-')}</td>
                    <td>
                        <span class="${store.store_type === 'WAREHOUSE' ? 'status-warehouse' : 'status-retail'}">
                            ${StoreUtils.formatStoreType(store.store_type)}
                        </span>
                    </td>
                    <td>${store.is_default_warehouse ? '✓ Yes' : 'No'}</td>
                    <td>${store.created_at ? new Date(store.created_at).toLocaleDateString() : '-'}</td>
                    <td>
                        <span class="${store.is_active ? 'status-active' : 'status-inactive'}">
                            ${store.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                    <td>
                        <button class="btn-edit">Edit</button>
                        <button class="btn-delete">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);

                // Bind edit/delete actions
                tr.querySelector('.btn-edit').onclick = () => window.storeController.startEdit(store);
                tr.querySelector('.btn-delete').onclick = () => {
                    if (confirm(`Are you sure you want to delete "${store.name}"?`)) {
                        window.storeController.deleteStore(store.id);
                    }
                };
            });
        }

        // Update stats cards
        const totalStores = stores.length;
        const retailStores = stores.filter(s => s.store_type === 'RETAIL').length;
        const warehouseStores = stores.filter(s => s.store_type === 'WAREHOUSE').length;

        const totalEl = document.querySelector(STORES_CONFIG.SELECTORS.TOTAL_STORES);
        const retailEl = document.querySelector(STORES_CONFIG.SELECTORS.RETAIL_STORES);
        const warehouseEl = document.querySelector(STORES_CONFIG.SELECTORS.WAREHOUSE_STORES);
        
        if (totalEl) totalEl.textContent = totalStores;
        if (retailEl) retailEl.textContent = retailStores;
        if (warehouseEl) warehouseEl.textContent = warehouseStores;
    }
}

class StoreController {
    constructor() {
        this.state = window.storeState;
        this.api = new StoreAPI();
        this.initEvents();
    }

    initEvents() {
        // Add store button
        const addButton = document.querySelector(STORES_CONFIG.SELECTORS.ADD_BUTTON);
        if (addButton) {
            addButton.addEventListener('click', () => this.openAddModal());
        }

        // Modal submit button
        const modalSubmit = document.querySelector(STORES_CONFIG.SELECTORS.MODAL_SUBMIT);
        if (modalSubmit) {
            modalSubmit.addEventListener('click', () => this.submitStore());
        }

        // Modal cancel button
        const modalCancel = document.querySelector(STORES_CONFIG.SELECTORS.MODAL_CANCEL);
        if (modalCancel) {
            modalCancel.addEventListener('click', () => this.cancel());
        }
    }

    openAddModal() {
        this.state.clearEditMode();
        this.state.openModal();
    }

    async loadStores() {
        try {
            this.state.setLoading(true);
            StoreUtils.hideError();

            const stores = await this.api.list();
            this.state.stores = stores;
            StoreUI.renderList(stores);

        } catch (err) {
            StoreUtils.showError(STORES_CONFIG.MESSAGES.ERROR_FETCH);
            console.error('Error loading stores:', err);
        } finally {
            this.state.setLoading(false);
        }
    }

    async submitStore() {
        const formData = {
            name: document.querySelector(STORES_CONFIG.SELECTORS.STORE_NAME).value,
            location: document.querySelector(STORES_CONFIG.SELECTORS.STORE_LOCATION).value,
            store_type: document.querySelector(STORES_CONFIG.SELECTORS.STORE_TYPE).value,
            is_default_warehouse: document.querySelector(STORES_CONFIG.SELECTORS.STORE_DEFAULT_WAREHOUSE).checked,
            is_active: document.querySelector(STORES_CONFIG.SELECTORS.STORE_ACTIVE).checked
        };

        // Only include is_default_warehouse for warehouses
        if (formData.store_type !== 'WAREHOUSE') {
            formData.is_default_warehouse = false;
        }

        // Validate
        if (!StoreUtils.validate(formData)) return;

        try {
            this.state.setLoading(true);

            if (this.state.editId) {
                await this.api.update(this.state.editId, formData);
                StoreUtils.showSuccess(STORES_CONFIG.MESSAGES.SUCCESS_UPDATE);
            } else {
                await this.api.create(formData);
                StoreUtils.showSuccess(STORES_CONFIG.MESSAGES.SUCCESS_ADD);
            }

            // Close modal and reload data
            this.state.closeModal();
            await this.loadStores();

        } catch (err) {
            StoreUtils.showError(err.message || STORES_CONFIG.MESSAGES.ERROR_SAVE);
            console.error('Error saving store:', err);
        } finally {
            this.state.setLoading(false);
        }
    }

    startEdit(store) {
        this.state.setEditMode(store);
        this.state.openModal();
    }

    cancel() {
        this.state.closeModal();
    }

    async deleteStore(id) {
        try {
            this.state.setLoading(true);
            await this.api.delete(id);
            StoreUtils.showSuccess(STORES_CONFIG.MESSAGES.SUCCESS_DELETE);
            await this.loadStores();
        } catch (err) {
            StoreUtils.showError(err.message || STORES_CONFIG.MESSAGES.ERROR_DELETE);
            console.error('Error deleting store:', err);
        } finally {
            this.state.setLoading(false);
        }
    }
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    window.storeState = new StoreState();
    window.storeController = new StoreController();
    window.storeController.loadStores();
});