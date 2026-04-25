console.log("✅ Dashboard JS loaded");

let salesChart = null;
let categoryChart = null;

function formatCurrency(value) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(value || 0);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// ================= LOAD DATA =================
async function loadDashboardData() {
    try {
        console.log("Loading dashboard data...");
        
        // Show loading spinner
        document.getElementById('loading-spinner').style.display = 'block';
        document.getElementById('dashboard-content').style.display = 'none';
        
        const res = await fetch('/inventory/api/dashboard/summary/');
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log("Data received:", data);

        if (!data.success) {
            throw new Error(data.message || "API failure");
        }

        // Hide loading spinner and show content
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';

        // Update timestamp
        document.getElementById('data-timestamp').textContent =
            `Data as of: ${new Date(data.timestamp).toLocaleString()}`;

        // Populate all dashboard components
        createSummaryCards(data.summary_cards);
        createSalesChart(data.charts.daily_sales);
        createCategoryChart(data.charts.category_distribution);
        createRecentSalesTable(data.tables.recent_sales);
        createLowStockTable(data.tables.low_stock_items);
        createStorePerformanceTable(data.tables.store_performance);
        createUserActivityTable(data.tables.user_activity);
        createRecentTransactionsTable(data.tables.recent_transactions);
        createRecentTransfersTable(data.tables.recent_transfers);

    } catch (err) {
        console.error('Error loading dashboard data:', err);
        document.getElementById('loading-spinner').innerHTML =
            `<div class="alert alert-danger">
                <h4>Failed to load dashboard</h4>
                <p>${err.message}</p>
                <button onclick="location.reload()" class="btn btn-sm btn-warning">Retry</button>
            </div>`;
    }
}

// ================= SUMMARY CARDS =================
function createSummaryCards(s) {
    const el = document.getElementById('summary-cards');
    
    // Create two rows of summary cards
    el.innerHTML = `
        <!-- First Row -->
        <div class="row mb-3">
            <div class="col-md-2 col-sm-6 mb-3">
                <div class="card text-center h-100 border-primary">
                    <div class="card-body">
                        <i class="fas fa-box fa-2x text-primary mb-2"></i>
                        <h6>Total Products</h6>
                        <h4 class="text-primary">${s.total_products.toLocaleString()}</h4>
                    </div>
                </div>
            </div>
            
            <div class="col-md-2 col-sm-6 mb-3">
                <div class="card text-center h-100 border-success">
                    <div class="card-body">
                        <i class="fas fa-tags fa-2x text-success mb-2"></i>
                        <h6>Categories</h6>
                        <h4 class="text-success">${s.active_categories.toLocaleString()}</h4>
                    </div>
                </div>
            </div>
            
            <div class="col-md-2 col-sm-6 mb-3">
                <div class="card text-center h-100 border-info">
                    <div class="card-body">
                        <i class="fas fa-store fa-2x text-info mb-2"></i>
                        <h6>Stores</h6>
                        <h4 class="text-info">${s.total_stores.toLocaleString()}</h4>
                    </div>
                </div>
            </div>
            
            <div class="col-md-2 col-sm-6 mb-3">
                <div class="card text-center h-100 border-warning">
                    <div class="card-body">
                        <i class="fas fa-users fa-2x text-warning mb-2"></i>
                        <h6>Users</h6>
                        <h4 class="text-warning">${s.total_users.toLocaleString()}</h4>
                    </div>
                </div>
            </div>
            
            <div class="col-md-2 col-sm-6 mb-3">
                <div class="card text-center h-100 border-danger">
                    <div class="card-body">
                        <i class="fas fa-chart-line fa-2x text-danger mb-2"></i>
                        <h6>Today's Sales</h6>
                        <h4 class="text-danger">${formatCurrency(s.today_sales_total)}</h4>
                        <small class="text-muted">${s.today_sales_count} transactions</small>
                    </div>
                </div>
            </div>
            
            <div class="col-md-2 col-sm-6 mb-3">
                <div class="card text-center h-100 border-secondary">
                    <div class="card-body">
                        <i class="fas fa-database fa-2x text-secondary mb-2"></i>
                        <h6>Stock Value</h6>
                        <h4 class="text-secondary">${formatCurrency(s.total_stock_value)}</h4>
                        <small class="text-muted">${s.total_stock_items} items</small>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Second Row -->
        <div class="row">
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card text-center h-100 ${s.low_stock_count > 0 ? 'border-warning' : 'border-success'}">
                    <div class="card-body">
                        <i class="fas fa-exclamation-triangle fa-2x ${s.low_stock_count > 0 ? 'text-warning' : 'text-success'} mb-2"></i>
                        <h6>Low Stock Items</h6>
                        <h4 class="${s.low_stock_count > 0 ? 'text-warning' : 'text-success'}">${s.low_stock_count}</h4>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card text-center h-100 border-primary">
                    <div class="card-body">
                        <i class="fas fa-calendar-alt fa-2x text-primary mb-2"></i>
                        <h6>Monthly Sales</h6>
                        <h4 class="text-primary">${formatCurrency(s.month_sales_total)}</h4>
                        <small class="text-muted">${s.month_transactions} transactions</small>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card text-center h-100 border-success">
                    <div class="card-body">
                        <i class="fas fa-chart-bar fa-2x text-success mb-2"></i>
                        <h6>Avg Sale Value</h6>
                        <h4 class="text-success">${formatCurrency(s.avg_sale_value)}</h4>
                        <small class="text-muted">Per transaction</small>
                    </div>
                </div>
            </div>
            
            <div class="col-md-3 col-sm-6 mb-3">
                <div class="card text-center h-100 ${s.revenue_growth_percent >= 0 ? 'border-success' : 'border-danger'}">
                    <div class="card-body">
                        <i class="fas fa-percentage fa-2x ${s.revenue_growth_percent >= 0 ? 'text-success' : 'text-danger'} mb-2"></i>
                        <h6>Revenue Growth</h6>
                        <h4 class="${s.revenue_growth_percent >= 0 ? 'text-success' : 'text-danger'}">
                            ${s.revenue_growth_percent >= 0 ? '+' : ''}${s.revenue_growth_percent.toFixed(1)}%
                        </h4>
                        <small class="text-muted">Last 30 days</small>
                    </div>
                </div>
            </div>
        </div>`;
}

// ================= CHARTS =================
function createSalesChart(data) {
    const labels = data.map(d => new Date(d.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    }));
    const values = data.map(d => d.total);
    const counts = data.map(d => d.count);

    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (salesChart) salesChart.destroy();

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Sales Amount (KES)',
                    data: values,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Transaction Count',
                    data: counts,
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Sales Amount (KES)'
                    },
                    ticks: {
                        callback: function(value) {
                            return 'KES ' + value.toLocaleString();
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Transaction Count'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                if (label.includes('Amount')) {
                                    label += ': ' + formatCurrency(context.parsed.y);
                                } else {
                                    label += ': ' + context.parsed.y;
                                }
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function createCategoryChart(data) {
    const labels = data.map(d => d.name);
    const values = data.map(d => d.total_stock);
    const productCounts = data.map(d => d.product_count);

    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#0d6efd', '#6610f2', '#6f42c1', '#d63384',
                    '#fd7e14', '#20c997', '#198754', '#0dcaf0',
                    '#6c757d', '#ffc107'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            const index = context.dataIndex;
                            const productCount = productCounts[index] || 0;
                            
                            return [
                                `${label}: ${value} items`,
                                `${percentage}% of total stock`,
                                `${productCount} products in category`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// ================= TABLES =================
function createRecentSalesTable(sales) {
    const tbody = document.querySelector('#recent-sales-table tbody');
    tbody.innerHTML = '';

    sales.forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td>${s.timestamp}</td>
                <td>
                    <a href="/inventory/sales/${s.id}/" class="text-decoration-none">
                        ${s.sale_id}
                    </a>
                </td>
                <td>${s.cashier}</td>
                <td>${s.store}</td>
                <td>${s.item_count}</td>
                <td class="fw-bold">${formatCurrency(s.total)}</td>
            </tr>`;
    });
}

function createLowStockTable(items) {
    const container = document.getElementById('low-stock-container');
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> No low stock items!
            </div>`;
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead class="table-warning">
                    <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Current Stock</th>
                        <th>Required</th>
                        <th>Difference</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>`;

    items.forEach(item => {
        const diff = item.difference;
        const statusClass = diff > 10 ? 'danger' : diff > 5 ? 'warning' : 'info';
        const statusText = diff > 10 ? 'Critical' : diff > 5 ? 'Low' : 'Near Reorder';
        
        html += `
            <tr>
                <td>${item.name}</td>
                <td><code>${item.sku}</code></td>
                <td><span class="badge bg-secondary">${item.current_stock}</span></td>
                <td><span class="badge bg-success">${item.required}</span></td>
                <td><span class="badge bg-${statusClass}">${diff}</span></td>
                <td><span class="badge bg-${statusClass}">${statusText}</span></td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function createStorePerformanceTable(stores) {
    const container = document.getElementById('store-performance-container');
    if (!container) return;

    let html = `
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead class="table-primary">
                    <tr>
                        <th>Store</th>
                        <th>Type</th>
                        <th>Products</th>
                        <th>Stock Value</th>
                        <th>Sales (30 days)</th>
                        <th>Low Stock</th>
                    </tr>
                </thead>
                <tbody>`;

    stores.forEach(store => {
        const lowStockClass = store.low_stock_items > 5 ? 'danger' : 
                             store.low_stock_items > 0 ? 'warning' : 'success';
        
        html += `
            <tr>
                <td><strong>${store.name}</strong></td>
                <td><span class="badge bg-secondary">${store.type}</span></td>
                <td>${store.total_products}</td>
                <td>${formatCurrency(store.stock_value)}</td>
                <td>
                    ${formatCurrency(store.total_sales)}
                    <small class="text-muted d-block">${store.sales_count} sales</small>
                </td>
                <td>
                    <span class="badge bg-${lowStockClass}">
                        ${store.low_stock_items}
                    </span>
                </td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function createUserActivityTable(users) {
    const container = document.getElementById('user-activity-container');
    if (!container) return;

    let html = `
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead class="table-info">
                    <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Today's Sales</th>
                        <th>Last Login</th>
                    </tr>
                </thead>
                <tbody>`;

    users.forEach(user => {
        const salesClass = user.today_sales > 10 ? 'success' : 
                          user.today_sales > 0 ? 'primary' : 'secondary';
        
        html += `
            <tr>
                <td>${user.name}</td>
                <td><span class="badge bg-secondary">${user.role}</span></td>
                <td>
                    <span class="badge bg-${salesClass}">
                        ${user.today_sales}
                    </span>
                </td>
                <td><small class="text-muted">${user.last_login}</small></td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function createRecentTransactionsTable(transactions) {
    const container = document.getElementById('recent-transactions-container');
    if (!container) return;

    let html = `
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Time</th>
                        <th>Product</th>
                        <th>Type</th>
                        <th>Quantity</th>
                        <th>Location</th>
                        <th>User</th>
                    </tr>
                </thead>
                <tbody>`;

    transactions.forEach(trans => {
        const typeClass = trans.type.includes('IN') ? 'success' : 
                         trans.type.includes('OUT') ? 'danger' : 'warning';
        
        html += `
            <tr>
                <td><small>${trans.timestamp}</small></td>
                <td>${trans.product}</td>
                <td><span class="badge bg-${typeClass}">${trans.type}</span></td>
                <td>${trans.quantity}</td>
                <td>
                    ${trans.store}
                    ${trans.to_store ? `<br><small>→ ${trans.to_store}</small>` : ''}
                </td>
                <td>${trans.performed_by}</td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function createRecentTransfersTable(transfers) {
    const container = document.getElementById('recent-transfers-container');
    if (!container) return;

    let html = `
        <div class="table-responsive">
            <table class="table table-sm table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Time</th>
                        <th>Product</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Quantity</th>
                        <th>User</th>
                    </tr>
                </thead>
                <tbody>`;

    transfers.forEach(transfer => {
        html += `
            <tr>
                <td><small>${transfer.created_at}</small></td>
                <td>${transfer.product}</td>
                <td>${transfer.from_store}</td>
                <td>${transfer.to_store}</td>
                <td><span class="badge bg-info">${transfer.quantity}</span></td>
                <td>${transfer.performed_by}</td>
            </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

// ================= INITIALIZE =================
document.addEventListener('DOMContentLoaded', () => {
    // Setup refresh button
    document.getElementById('refresh-btn').onclick = loadDashboardData;
    
    // Auto-refresh every 5 minutes
    setInterval(loadDashboardData, 5 * 60 * 1000);
    
    // Load initial data
    loadDashboardData();
    
    // Add keyboard shortcut for refresh (Ctrl+R)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            loadDashboardData();
        }
    });
});