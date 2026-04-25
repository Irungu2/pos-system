let currentReportType = '';
let currentReportData = null;

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    $('#storeSelect').select2();
    loadDashboardData();
});

// Load dashboard data
function loadDashboardData() {
    showLoading();
    const storeId = $('#storeSelect').val();
    
    fetch(`/api/dashboard-data/?store_id=${storeId || ''}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateDashboard(data.data);
            } else {
                showError('Failed to load dashboard data');
            }
        })
        .catch(error => {
            showError('Network error: ' + error.message);
        })
        .finally(() => {
            hideLoading();
        });
}

// Update dashboard with data
function updateDashboard(data) {
    const statsCards = document.getElementById('statsCards');
    statsCards.innerHTML = `
        <div class="col-md-3 mb-3">
            <div class="card stat-card bg-primary text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="card-subtitle mb-2">Total Sales</h6>
                            <h2 class="card-title">$${data.total_sales.toFixed(2)}</h2>
                        </div>
                        <i class="bi bi-cash-stack" style="font-size: 2.5rem;"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card stat-card bg-success text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="card-subtitle mb-2">Today's Sales</h6>
                            <h2 class="card-title">$${data.today_sales.toFixed(2)}</h2>
                        </div>
                        <i class="bi bi-calendar-check" style="font-size: 2.5rem;"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card stat-card bg-warning text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="card-subtitle mb-2">Orders Today</h6>
                            <h2 class="card-title">${data.orders_today}</h2>
                        </div>
                        <i class="bi bi-cart-check" style="font-size: 2.5rem;"></i>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-3 mb-3">
            <div class="card stat-card bg-info text-white">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="card-subtitle mb-2">Avg. Order Value</h6>
                            <h2 class="card-title">$${data.avg_order_value.toFixed(2)}</h2>
                        </div>
                        <i class="bi bi-graph-up-arrow" style="font-size: 2.5rem;"></i>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Update charts
    if (data.sales_trend) {
        updateSalesChart(data.sales_trend);
    }

    if (data.top_products) {
        updateProductsChart(data.top_products);
    }
}

// Update Sales Chart
function updateSalesChart(salesTrend) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: salesTrend.labels,
            datasets: [{
                label: 'Sales',
                data: salesTrend.data,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            }
        }
    });
}

// Update Products Chart
function updateProductsChart(products) {
    const ctx = document.getElementById('productsChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: products.map(p => p.name),
            datasets: [{
                data: products.map(p => p.quantity),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                    '#9966FF', '#FF9F40', '#C9CBCF', '#4BC0C0',
                    '#36A2EB', '#FF6384'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

// Show Loading Spinner
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide Loading Spinner
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Show Error
function showError(message) {
    alert('Error: ' + message);
}

// Print Report
function printReport() {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>${document.getElementById('reportModalTitle').textContent}</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h2>${document.getElementById('reportModalTitle').textContent}</h2>
                ${document.getElementById('reportModalBody').innerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// Export Report
function exportReport() {
    if (!currentReportData) return;

    const ws = XLSX.utils.json_to_sheet(
        Array.isArray(currentReportData) ? currentReportData : [currentReportData]
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${currentReportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Load Report (with filters)
function loadReport(reportType, filters = {}) {
    showLoading();
    currentReportType = reportType;
    
    const storeId = $('#storeSelect').val();
    const data = {
        report_type: reportType,
        filters: { ...filters, store_id: storeId }
    };

    fetch('/api/sales-report/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentReportData = data.report;
                showReportModal(data.report);
            } else {
                showError(data.error || 'Failed to load report');
            }
        })
        .catch(error => {
            showError('Network error: ' + error.message);
        })
        .finally(() => {
            hideLoading();
        });
}

// Show Report Modal
function showReportModal(reportData) {
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    const title = document.getElementById('reportModalTitle');
    const body = document.getElementById('reportModalBody');
    
    // Set title based on report type
    const reportTitles = {
        'SALES_SUMMARY': 'Sales Summary Report',
        'PRODUCT_SALES': 'Product Sales Report',
        'CASHIER_PERFORMANCE': 'Cashier Performance Report',
        'TAX_REPORT': 'Tax Report',
        'SALES_VS_STOCK': 'Sales vs Stock Report',
        'CATEGORY_PROFITABILITY': 'Category Profitability Report',
        'END_OF_DAY': 'End of Day Report'
    };
    
    title.textContent = reportTitles[currentReportType] || 'Report';
    
    // Generate report HTML based on type
    body.innerHTML = generateReportHTML(reportData);
    
    modal.show();
}

// Utility functions to get cookie, handle errors, etc.
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

