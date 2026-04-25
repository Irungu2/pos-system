
# from django.urls import path, include
# from django.views.generic import TemplateView
# from rest_framework.routers import DefaultRouter
# from django.contrib.auth.decorators import login_required

# from .views import (
#     CategoryViewSet, ProductViewSet, StoreViewSet,
#     StoreStockViewSet, StockTransactionViewSet, StockTransferViewSet,
#     BulkRestockViewSet,
#     inventory_summary,
# ) 
#       # Add these
# from .sales_report_views import   dashboard_summary, get_summary_data , SalesReportView, reports_view
# # SalesReportView, reports_view, dashboard_summary,get_summary_data, get_quick_stats

# app_name = "inventory"  # ✅ Add this

# router = DefaultRouter()
# router.register(r'categories', CategoryViewSet)
# router.register(r'products', ProductViewSet)
# router.register(r'stores', StoreViewSet)
# router.register(r'store-stocks', StoreStockViewSet)
# router.register(r'stock-transactions', StockTransactionViewSet)
# router.register(r'stock-transfers', StockTransferViewSet)
# router.register(r'bulk-restocks', BulkRestockViewSet, basename='bulkrestock')

# urlpatterns = [
#     # REST API routes
#     path('', include(router.urls)),

#     # Summary
#     path('inventory-summary/', inventory_summary, name='inventory-summary'),

#     # Template UI views
#     path('categories-ui/', login_required(TemplateView.as_view(template_name="inventory/categories.html")), name='categories_ui'),
#     path('product-ui/', login_required(TemplateView.as_view(template_name="inventory/product.html")), name='products_ui'),
#     path('stores-ui/', login_required(TemplateView.as_view(template_name="inventory/store.html")), name='stores_ui'),
#     path('store-stocks-ui/', login_required(TemplateView.as_view(template_name="inventory/storestock.html")), name='store_stocks_ui'),
#     path('stock-transactions-ui/', login_required(TemplateView.as_view(template_name="inventory/stocktransaction.html")), name='stock_transactions_ui'),
#     path('stock-transfers-ui/', login_required(TemplateView.as_view(template_name="inventory/stocktransfer.html")), name='stock_transfers_ui'),

#     # Bulk Restock UI page
#     path(
#         'bulk-restocks-ui/',
#         login_required(BulkRestockViewSet.as_view({'get': 'page'})),
#         name='bulk-restock-ui'
#     ),

#     # Dashboard & Reports
#     path('dashboard/', dashboard_summary, name='admin'),
#     path('api/dashboard/summary/', get_summary_data, name='get_summary_data'),
#     # path('api/dashboard/quick-stats/', get_quick_stats, name='get_quick_stats'),

#     # Reports - Only one path
#     path("reports/", reports_view, name="reports"),
#     path("reports/sales/", SalesReportView.as_view(), name="sale-report"),
# ]
from django.urls import path, include
from django.views.generic import TemplateView
from rest_framework.routers import DefaultRouter
from django.contrib.auth.decorators import login_required

from .views import (
    CategoryViewSet, ProductViewSet, StoreViewSet,
    StoreStockViewSet, StockTransactionViewSet, StockTransferViewSet,
    BulkRestockViewSet,
    inventory_summary,
    get_product_by_barcode,           # Barcode lookup
    bulk_barcode_scan,                # Bulk barcode scan
    print_product_barcode,            # ✅ NEW: Print single barcode
    print_multiple_barcodes,          # ✅ NEW: Print multiple barcodes
    barcode_print_page,               # ✅ NEW: Barcode print selection page
    print_barcode_from_barcode,       # ✅ NEW: Print from barcode number
)

# Add these
from .sales_report_views import dashboard_summary, get_summary_data, SalesReportView, reports_view

app_name = "inventory"

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'stores', StoreViewSet)
router.register(r'store-stocks', StoreStockViewSet)
router.register(r'stock-transactions', StockTransactionViewSet)
router.register(r'stock-transfers', StockTransferViewSet)
router.register(r'bulk-restocks', BulkRestockViewSet, basename='bulkrestock')

urlpatterns = [
    # REST API routes
    path('', include(router.urls)),

    # Summary
    path('inventory-summary/', inventory_summary, name='inventory-summary'),

    # ============================================================
    # BARCODE SCANNER API ENDPOINTS
    # ============================================================
    path('products/by-barcode/<str:barcode>/', 
         get_product_by_barcode, 
         name='product-by-barcode'),
    
    path('products/bulk-barcode-scan/', 
         bulk_barcode_scan, 
         name='bulk-barcode-scan'),
    
    # ============================================================
    # BARCODE PRINTING ENDPOINTS (NEW)
    # ============================================================
    # Print single barcode label
    path('print-barcode/<int:product_id>/', 
         print_product_barcode, 
         name='print_barcode'),
    
    # Print barcode from barcode number (useful for re-printing)
    path('print-barcode/from-barcode/<str:barcode>/', 
         print_barcode_from_barcode, 
         name='print_barcode_from_barcode'),
    
    # Print multiple barcodes at once
    path('print-multiple-barcodes/', 
         print_multiple_barcodes, 
         name='print_multiple_barcodes'),
    
    # HTML page for selecting products to print
    path('barcode-print-page/', 
         barcode_print_page, 
         name='barcode_print_page'),
    
    # Optional: Search products by partial barcode (for scanner suggestions)
    path('products/search-by-barcode/', 
         lambda request: ProductViewSet.as_view({'get': 'search_by_barcode'})(request),
         name='search-by-barcode'),

    # Template UI views
    path('categories-ui/', login_required(TemplateView.as_view(template_name="inventory/categories.html")), name='categories_ui'),
    path('product-ui/', login_required(TemplateView.as_view(template_name="inventory/product.html")), name='products_ui'),
    path('stores-ui/', login_required(TemplateView.as_view(template_name="inventory/store.html")), name='stores_ui'),
    path('store-stocks-ui/', login_required(TemplateView.as_view(template_name="inventory/storestock.html")), name='store_stocks_ui'),
    path('stock-transactions-ui/', login_required(TemplateView.as_view(template_name="inventory/stocktransaction.html")), name='stock_transactions_ui'),
    path('stock-transfers-ui/', login_required(TemplateView.as_view(template_name="inventory/stocktransfer.html")), name='stock_transfers_ui'),

    # Bulk Restock UI page
    path(
        'bulk-restocks-ui/',
        login_required(BulkRestockViewSet.as_view({'get': 'page'})),
        name='bulk-restock-ui'
    ),

    # Dashboard & Reports
    path('dashboard/', dashboard_summary, name='admin'),
    path('api/dashboard/summary/', get_summary_data, name='get_summary_data'),

    # Reports
    path("reports/", reports_view, name="reports"),
    path("reports/sales/", SalesReportView.as_view(), name="sale-report"),
]