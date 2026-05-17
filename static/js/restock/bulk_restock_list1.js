// static/inventory/js/bulk_restock_list.js

class BulkRestockList {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        // Load stores for filter dropdown
        this.loadStores();
        
        // Load initial restocks
        this.loadRestocks();
        
        // Bind event listeners
        this.bindEvents();
    }
    
    bindEvents() {
        // Filter change events
        const filters = ['filter-status', 'filter-store', 'filter-date-from', 'filter-date-to'];
        filters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.loadRestocks());
                if (id.includes('date')) {
                    element.addEventListener('input', () => this.loadRestocks());
                }
            }
        });
        
        // Clear filters button
        const clearBtn = document.getElementById('clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
        
        // Infinite scroll
        window.addEventListener('scroll', () => {
            if (this.shouldLoadMore()) {
                this.loadMore();
            }
        });
    }
    
    async loadStores() {
        try {
            const response = await fetch('/inventory/stores/');
            const stores = await response.json();
            
            const storeSelect = document.getElementById('filter-store');
            if (storeSelect && stores.results) {
                stores.results.forEach(store => {
                    const option = document.createElement('option');
                    option.value = store.id;
                    option.textContent = store.name;
                    storeSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading stores:', error);
        }
    }
    
    showLoading() {
        this.isLoading = true;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'flex';
    }
    
    hideLoading() {
        this.isLoading = false;
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    getFilterParams() {
        const params = new URLSearchParams();
        
        const status = document.getElementById('filter-status')?.value;
        if (status) params.append('status', status);
        
        const storeId = document.getElementById('filter-store')?.value;
        if (storeId) params.append('store', storeId);
        
        const dateFrom = document.getElementById('filter-date-from')?.value;
        if (dateFrom) params.append('created_at__gte', dateFrom);
        
        const dateTo = document.getElementById('filter-date-to')?.value;
        if (dateTo) params.append('created_at__lte', dateTo);
        
        // Pagination
        params.append('page', this.currentPage);
        params.append('page_size', this.pageSize);
        
        return params;
    }
    
    // async loadRestocks(resetPage = true) {
    //     if (resetPage) {
    //         this.currentPage = 1;
    //         this.totalPages = 1;
    //     }
        
    //     if (this.isLoading) return;
        
    //     this.showLoading();
        
    //     try {
    //         const params = this.getFilterParams();
    //         const url = `/inventory/workflow-bulk-restocks/?${params.toString()}`;
            
    //         const response = await fetch(url);
    //         const data = await response.json();
            
    //         // Handle paginated response
    //         const restocks = data.results || data;
    //         this.totalPages = Math.ceil((data.count || restocks.length) / this.pageSize);
            
    //         const tbody = document.getElementById('restock-list-body');
            
    //         if (!tbody) return;
            
    //         if (restocks.length === 0 && this.currentPage === 1) {
    //             tbody.innerHTML = '<tr><td colspan="9" class="empty">No restocks found</td></tr>';
    //             return;
    //         }
            
    //         if (resetPage) {
    //             tbody.innerHTML = this.renderRestocks(restocks);
    //         } else {
    //             tbody.innerHTML += this.renderRestocks(restocks);
    //         }
            
    //     } catch (error) {
    //         console.error('Error loading restocks:', error);
    //         const tbody = document.getElementById('restock-list-body');
    //         if (tbody) {
    //             tbody.innerHTML = '<tr><td colspan="9" class="error">Error loading restocks. Please try again.</td></tr>';
    //         }
    //     } finally {
    //         this.hideLoading();
    //     }
    // }
    async loadRestocks(resetPage = true) {

        console.log("================================================");
        console.log("[FRONTEND] loadRestocks START");
        console.log("================================================");

        if (resetPage) {
            this.currentPage = 1;
            this.totalPages = 1;
        }

        if (this.isLoading) { 
            console.log("[DEBUG] Already loading. Returning...");
            return;
        }

        this.showLoading();

        try {

            const params = this.getFilterParams();

            console.log("[DEBUG] Filter params:", params.toString());

            // const url = `/inventory/workflow-bulk-restocks/?${params.toString()}`;
            const url = `/inventory/workflow-bulk-restocks/Allrestocks/?${params.toString()}`;

            console.log("[DEBUG] Fetch URL:", url);

            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            });

            console.log("[DEBUG] Response status:", response.status);
            console.log("[DEBUG] Response content-type:",
                response.headers.get("content-type"));

            // Read raw response first
            const rawText = await response.text();

            console.log("[DEBUG] Raw response preview:",
                rawText.substring(0, 300));

            // Check if response is HTML
            if (rawText.startsWith("<!DOCTYPE")) {

                console.error("[ERROR] Server returned HTML instead of JSON");

                const tbody = document.getElementById('restock-list-body');

                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="9" class="error">
                                Server returned HTML instead of JSON.
                                Check login/session/backend URL.
                            </td>
                        </tr>
                    `;
                }

                return;
            }

            // Convert manually
            const data = JSON.parse(rawText);

            console.log("[DEBUG] Parsed JSON:", data);

            // Handle paginated response
            const restocks = data.results || data;

            this.totalPages = Math.ceil(
                (data.count || restocks.length) / this.pageSize
            );

            console.log("[DEBUG] Restocks count:", restocks.length);
            console.log("[DEBUG] Total pages:", this.totalPages);

            const tbody = document.getElementById('restock-list-body');

            if (!tbody) {
                console.warn("[WARNING] Table body not found");
                return;
            }

            if (restocks.length === 0 && this.currentPage === 1) {

                console.log("[DEBUG] No restocks found");

                tbody.innerHTML =
                    '<tr><td colspan="9" class="empty">No restocks found</td></tr>';

                return;
            }

            if (resetPage) {

                console.log("[DEBUG] Rendering fresh restocks");

                tbody.innerHTML = this.renderRestocks(restocks);

            } else {

                console.log("[DEBUG] Appending restocks");

                tbody.innerHTML += this.renderRestocks(restocks);
            }

            console.log("[DEBUG] Restocks rendered successfully");

        } catch (error) {

            console.error("================================================");
            console.error("[ERROR] Error loading restocks");
            console.error(error);
            console.error("================================================");

            const tbody = document.getElementById('restock-list-body');

            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="error">
                            Error loading restocks:
                            ${error.message}
                        </td>
                    </tr>
                `;
            }

        } finally {

            console.log("[FRONTEND] loadRestocks END");

            this.hideLoading();
        }
    }
    
    renderRestocks(restocks) {
        if (!restocks || restocks.length === 0) return '';
        
        return restocks.map(restock => `
            <tr data-restock-id="${restock.id}">
                <td>${restock.id}</td>
                <td>${restock.store?.name || '-'}</td>
                <td>${restock.category?.name || 'All'}</td>
                <td><span class="status-badge status-${restock.status}">${restock.status}</span></td>
                <td>${restock.items?.length || 0}</td>
                <td>${restock.total_quantity_change || 0}</td>
                <td>$${this.formatNumber(restock.total_value || 0)}</td>
                <td>${this.formatDate(restock.created_at)}</td>
                <td>${this.getActionButtons(restock)}</td>
            </tr>
        `).join('');
    }
    
    getActionButtons(restock) {
        const baseUrl = `/inventory/workflow-bulk-restocks/${restock.id}`;
        
        switch(restock.status) {
            case 'draft':
                return `<a href="${baseUrl}/edit/" class="btn-sm">Edit</a>`;
            case 'reviewed':
                return `<a href="${baseUrl}/review/" class="btn-sm">Review</a>`;
            case 'processing':
                return `<span class="text-muted">Processing...</span>`;
            case 'completed':
                return `<span class="text-muted">Completed</span>`;
            default:
                return `<a href="${baseUrl}/" class="btn-sm">View</a>`;
        }
    }
    
    async loadMore() {
        if (this.currentPage < this.totalPages && !this.isLoading) {
            this.currentPage++;
            await this.loadRestocks(false);
        }
    }
    
    shouldLoadMore() {
        const scrollPosition = window.innerHeight + window.scrollY;
        const threshold = document.body.offsetHeight - 500;
        return scrollPosition >= threshold && !this.isLoading;
    }
    
    clearFilters() {
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-store').value = '';
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        this.loadRestocks(true);
    }
    
    formatNumber(value) {
        return Number(value).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.bulkRestockList = new BulkRestockList();
});