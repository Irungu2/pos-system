// static/js/restock/bulk_restock_success.js

class BulkRestockSuccess {
    constructor() {
        this.restockId = this.getRestockId();
        this.restockData = null;
        
        this.init();
    }
    
    getRestockId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }
    
    async init() {
        if (!this.restockId) {
            this.showError('Restock ID not found');
            return;
        }
        
        await this.loadRestockData();
        this.bindEvents();
    }
    
    bindEvents() {
        const printBtn = document.getElementById('print-summary-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printSummary());
        }
        
        const newRestockBtn = document.getElementById('new-restock-btn');
        if (newRestockBtn) {
            newRestockBtn.addEventListener('click', () => {
                window.location.href = '/inventory/workflow-bulk-restocks/create/';
            });
        }
    }
    
    async loadRestockData() {
        this.showLoading();
        
        try {
            const response = await fetch(`/inventory/workflow-bulk-restocks/${this.restockId}/`);
            if (!response.ok) throw new Error('Failed to load restock data');
            this.restockData = await response.json();
            
            this.updateUI();
            
        } catch (error) {
            console.error('Error loading restock data:', error);
            this.showError('Failed to load restock details');
        } finally {
            this.hideLoading();
        }
    }
    
    updateUI() {
        // Update restock ID
        const restockIdEl = document.getElementById('restock-id');
        if (restockIdEl) restockIdEl.textContent = `#${this.restockData.id}`;
        
        // Update store name
        const storeNameEl = document.getElementById('store-name');
        if (storeNameEl && this.restockData.store) {
            storeNameEl.textContent = this.restockData.store.name;
        }
        
        // Update status
        const statusEl = document.getElementById('status');
        if (statusEl && this.restockData.status) {
            statusEl.innerHTML = `<span class="status-badge status-${this.restockData.status}">${this.restockData.status.toUpperCase()}</span>`;
        }
        
        // Calculate totals
        const items = this.restockData.items || [];
        const totalItems = items.length;
        const totalQuantity = items.reduce((sum, item) => sum + (item.new_quantity || item.quantity_change || 0), 0);
        const totalValue = items.reduce((sum, item) => {
            const qty = item.new_quantity || item.quantity_change || 0;
            const price = item.new_price || item.current_price || 0;
            return sum + (qty * price);
        }, 0);
        
        // Update totals
        const totalItemsEl = document.getElementById('total-items');
        if (totalItemsEl) totalItemsEl.textContent = totalItems;
        
        const totalQuantityEl = document.getElementById('total-quantity');
        if (totalQuantityEl) totalQuantityEl.textContent = totalQuantity;
        
        const totalValueEl = document.getElementById('total-value');
        if (totalValueEl) totalValueEl.textContent = `$${totalValue.toFixed(2)}`;
        
        // Update processed info
        const processedByEl = document.getElementById('processed-by');
        if (processedByEl && this.restockData.completed_by) {
            processedByEl.textContent = this.restockData.completed_by.username || this.restockData.completed_by.email || 'System';
        }
        
        const processedAtEl = document.getElementById('processed-at');
        if (processedAtEl && this.restockData.updated_at) {
            processedAtEl.textContent = new Date(this.restockData.updated_at).toLocaleString();
        }
    }
    
    printSummary() {
        window.print();
    }
    
    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'flex';
    }
    
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    showError(message) {
        alert(message);
        window.location.href = '/inventory/workflow-bulk-restocks/';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.bulkRestockSuccess = new BulkRestockSuccess();
});