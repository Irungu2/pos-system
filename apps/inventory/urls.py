# from django.urls import path, include
# from django.views.generic import TemplateView
# from rest_framework.routers import DefaultRouter
# from django.contrib.auth.decorators import login_required

# from .views import (
#     CategoryViewSet, ProductViewSet, StoreViewSet,
#     StoreStockViewSet, StockTransactionViewSet, StockTransferViewSet,
#     BulkRestockViewSet,
#     inventory_summary,
#     get_product_by_barcode,           # Barcode lookup
#     bulk_barcode_scan,                # Bulk barcode scan
#     print_product_barcode,            # ✅ NEW: Print single barcode
#     print_multiple_barcodes,          # ✅ NEW: Print multiple barcodes
#     barcode_print_page,               # ✅ NEW: Barcode print selection page
#     print_barcode_from_barcode,       # ✅ NEW: Print from barcode number
# )

# # Add these
# from .sales_report_views import dashboard_summary, get_summary_data, SalesReportView, reports_view

# app_name = "inventory"

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

#     # ============================================================
#     # BARCODE SCANNER API ENDPOINTS
#     # ============================================================
#     path('products/by-barcode/<str:barcode>/', 
#          get_product_by_barcode, 
#          name='product-by-barcode'),
    
#     path('products/bulk-barcode-scan/', 
#          bulk_barcode_scan, 
#          name='bulk-barcode-scan'),
    
#     # ============================================================
#     # BARCODE PRINTING ENDPOINTS (NEW)
#     # ============================================================
#     # Print single barcode label
#     path('print-barcode/<int:product_id>/', 
#          print_product_barcode, 
#          name='print_barcode'),
    
#     # Print barcode from barcode number (useful for re-printing)
#     path('print-barcode/from-barcode/<str:barcode>/', 
#          print_barcode_from_barcode, 
#          name='print_barcode_from_barcode'),
    
#     # Print multiple barcodes at once
#     path('print-multiple-barcodes/', 
#          print_multiple_barcodes, 
#          name='print_multiple_barcodes'),
    
#     # HTML page for selecting products to print
#     path('barcode-print-page/', 
#          barcode_print_page, 
#          name='barcode_print_page'),
    
#     # Optional: Search products by partial barcode (for scanner suggestions)
#     path('products/search-by-barcode/', 
#          lambda request: ProductViewSet.as_view({'get': 'search_by_barcode'})(request),
#          name='search-by-barcode'),

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
#         name='bulk_restock_ui'
#     ),

#     # Dashboard & Reports
#     path('dashboard/', dashboard_summary, name='admin'),
#     path('api/dashboard/summary/', get_summary_data, name='get_summary_data'),

#     # Reports
#     path("reports/", reports_view, name="reports"),
#     path("reports/sales/", SalesReportView.as_view(), name="sale-report"),
# ]
# from django.contrib.auth.decorators import login_required
# from django.urls import include, path
# from django.views.generic import TemplateView
# from rest_framework.routers import DefaultRouter

# from .sales_report_views import (
#     SalesReportView,
#     dashboard_summary,
#     get_summary_data,
#     reports_view,
# )

# from .views import (
#     # ViewSets
#     BulkRestockXlsViewSet,
#     CategoryViewSet,
#     ProductViewSet,
#     StockTransactionViewSet,
#     StockTransferViewSet,
#     StoreStockViewSet,
#     StoreViewSet,

#     # Inventory
#     inventory_summary,

#     # Barcode APIs
#     bulk_barcode_scan,
#     get_product_by_barcode,

#     # Barcode Printing
#     barcode_print_page,
#     print_barcode_from_barcode,
#     print_multiple_barcodes,
#     print_product_barcode,
# )

# from .restock_view import (
#     BulkRestockViewSet as AdvancedBulkRestockViewSet,
#     BulkRestockPageView,
#     BulkRestockCreatePageView,
#     BulkRestockEditPageView,
#     BulkRestockReviewPageView,
#     BulkRestockSuccessPageView,
# )

# app_name = "inventory"

# # ============================================================
# # API ROUTER
# # ============================================================

# router = DefaultRouter()
# router.register(r"categories", CategoryViewSet)
# router.register(r"products", ProductViewSet)
# router.register(r"stores", StoreViewSet)
# router.register(r"store-stocks", StoreStockViewSet)
# router.register(r"stock-transactions", StockTransactionViewSet)
# router.register(r"stock-transfers", StockTransferViewSet)
# router.register(
#     r"bulk-restocks",
#     BulkRestockXlsViewSet,
#     basename="bulkrestock",
# )
# router.register(
#     r"advanced-bulk-restocks",
#     AdvancedBulkRestockViewSet,
#     basename="advanced-bulk-restock",
# )
# # ============================================================
# # URL PATTERNS
# # ============================================================

# urlpatterns = [
#     # --------------------------------------------------------
#     # REST API
#     # --------------------------------------------------------
#     path("", include(router.urls)),

#     # --------------------------------------------------------
#     # Inventory
#     # --------------------------------------------------------
#     path(
#         "inventory-summary/",
#         inventory_summary,
#         name="inventory-summary",
#     ),

#     # --------------------------------------------------------
#     # Barcode Scanner APIs
#     # --------------------------------------------------------
#     path(
#         "products/by-barcode/<str:barcode>/",
#         get_product_by_barcode,
#         name="product-by-barcode",
#     ),
#     path(
#         "products/bulk-barcode-scan/",
#         bulk_barcode_scan,
#         name="bulk-barcode-scan",
#     ),
#     path(
#         "products/search-by-barcode/",
#         ProductViewSet.as_view({"get": "search_by_barcode"}),
#         name="search-by-barcode",
#     ),

#     # --------------------------------------------------------
#     # Barcode Printing
#     # --------------------------------------------------------
#     path(
#         "print-barcode/<int:product_id>/",
#         print_product_barcode,
#         name="print_barcode",
#     ),
#     path(
#         "print-barcode/from-barcode/<str:barcode>/",
#         print_barcode_from_barcode,
#         name="print_barcode_from_barcode",
#     ),
#     path(
#         "print-multiple-barcodes/",
#         print_multiple_barcodes,
#         name="print_multiple_barcodes",
#     ),
#     path(
#         "barcode-print-page/",
#         barcode_print_page,
#         name="barcode_print_page",
#     ),

#     # --------------------------------------------------------
#     # Template UI Pages
#     # --------------------------------------------------------
#     path(
#         "categories-ui/",
#         login_required(
#             TemplateView.as_view(
#                 template_name="inventory/categories.html"
#             )
#         ),
#         name="categories_ui",
#     ),
#     path(
#         "product-ui/",
#         login_required(
#             TemplateView.as_view(
#                 template_name="inventory/product.html"
#             )
#         ),
#         name="products_ui",
#     ),
#     path(
#         "stores-ui/",
#         login_required(
#             TemplateView.as_view(
#                 template_name="inventory/store.html"
#             )
#         ),
#         name="stores_ui",
#     ),
#     path(
#         "store-stocks-ui/",
#         login_required(
#             TemplateView.as_view(
#                 template_name="inventory/storestock.html"
#             )
#         ),
#         name="store_stocks_ui",
#     ),
#     path(
#         "stock-transactions-ui/",
#         login_required(
#             TemplateView.as_view(
#                 template_name="inventory/stocktransaction.html"
#             )
#         ),
#         name="stock_transactions_ui",
#     ),
#     path(
#         "stock-transfers-ui/",
#         login_required(
#             TemplateView.as_view(
#                 template_name="inventory/stocktransfer.html"
#             )
#         ),
#         name="stock_transfers_ui",
#     ),

#     # Bulk Restock UI
#     path(
#         "bulk-restocks-ui/",
#         login_required(
#             BulkRestockXlsViewSet.as_view({"get": "page"})
#         ),
#         name="bulk_restock_ui",
#     ),



#     #advanced bulk uisng steps
#     # --------------------------------------------------------
#     # Advanced Bulk Restock Pages
#     # --------------------------------------------------------

#     path(
#         "bulk-restocks/page/",
#         login_required(BulkRestockPageView.as_view()),
#         name="bulk_restock_page",
#     ),

#     path(
#         "bulk-restocks/create/",
#         login_required(BulkRestockCreatePageView.as_view()),
#         name="bulk_restock_create",
#     ),

#     path(
#         "bulk-restocks/<int:pk>/edit/",
#         login_required(BulkRestockEditPageView.as_view()),
#         name="bulk_restock_edit",
#     ),

#     path(
#         "bulk-restocks/<int:pk>/review/",
#         login_required(BulkRestockReviewPageView.as_view()),
#         name="bulk_restock_review",
#     ),

#     path(
#         "bulk-restocks/success/",
#         login_required(BulkRestockSuccessPageView.as_view()),
#         name="bulk_restock_success",
#     ),
#     # --------------------------------------------------------
#     # Dashboard & Reports
#     # --------------------------------------------------------
#     path(
#         "dashboard/",
#         dashboard_summary,
#         name="admin",
#     ),
#     path(
#         "api/dashboard/summary/",
#         get_summary_data,
#         name="get_summary_data",
#     ),

#     # Reports
#     path(
#         "reports/",
#         reports_view,
#         name="reports",
#     ),
#     path(
#         "reports/sales/",
#         SalesReportView.as_view(),
#         name="sale-report",
#     ),
# ]
from django.contrib.auth.decorators import login_required
from django.urls import include, path
from django.views.generic import TemplateView
from rest_framework.routers import DefaultRouter

from .sales_report_views import (
    SalesReportView,
    dashboard_summary,
    get_summary_data,
    reports_view,
)

from .views import (
    # ViewSets
    BulkRestockXlsViewSet,
    CategoryViewSet,
    ProductViewSet,
    StockTransactionViewSet,
    StockTransferViewSet,
    StoreStockViewSet,
    StoreViewSet,

    # Inventory
    inventory_summary,

    # Barcode APIs
    bulk_barcode_scan,
    get_product_by_barcode,

    # Barcode Printing
    barcode_print_page,
    print_barcode_from_barcode,
    print_multiple_barcodes,
    print_product_barcode,
)

from .restock_view import (
    BulkRestockViewSet as BulkRestockWorkflowViewSet,
    BulkRestockPageView,
    BulkRestockCreatePageView,
    BulkRestockEditPageView,
    BulkRestockReviewPageView,
    BulkRestockSuccessPageView,
)

app_name = "inventory"

# ============================================================
# API ROUTER
# ============================================================

router = DefaultRouter()

router.register(r"categories", CategoryViewSet)
router.register(r"products", ProductViewSet)
router.register(r"stores", StoreViewSet)
router.register(r"store-stocks", StoreStockViewSet)
router.register(r"stock-transactions", StockTransactionViewSet)
router.register(r"stock-transfers", StockTransferViewSet)

# XLS/API bulk restock
router.register(
    r"bulk-restocks",
    BulkRestockXlsViewSet,
    basename="bulkrestock",
)

# Workflow/API bulk restock
router.register(
    r"workflow-bulk-restocks",
    BulkRestockWorkflowViewSet,
    basename="workflow-bulk-restock",
)

# ============================================================
# URL PATTERNS
# ============================================================

urlpatterns = [

    # ========================================================
    # ADVANCED BULK RESTOCK PAGES
    # IMPORTANT:
    # Place BEFORE router.urls to avoid conflicts
    # ========================================================

    path(
        "workflow-bulk-restocks/",
        login_required(BulkRestockPageView.as_view()),
        name="bulk_restock_page1",
    ),

    path(
        "workflow-bulk-restocks/create/",
        login_required(BulkRestockCreatePageView.as_view()),
        name="bulk_restock_create",
    ),

    path(
        "workflow-bulk-restocks/<int:pk>/edit/",
        login_required(BulkRestockEditPageView.as_view()),
        name="bulk_restock_edit",
    ),

    path(
        "workflow-bulk-restocks/<int:pk>/review/",
        login_required(BulkRestockReviewPageView.as_view()),
        name="bulk_restock_review",
    ),

    path(
        "workflow-bulk-restocks/success/",
        login_required(BulkRestockSuccessPageView.as_view()),
        name="bulk_restock_success",
    ),

    # ========================================================
    # BULK RESTOCK XLS UI
    # ========================================================

    path(
        "bulk-restocks-ui/",
        login_required(
            BulkRestockXlsViewSet.as_view({"get": "page"})
        ),
        name="bulk_restock_ui",
    ),

    # ========================================================
    # INVENTORY
    # ========================================================

    path(
        "inventory-summary/",
        inventory_summary,
        name="inventory-summary",
    ),

    # ========================================================
    # BARCODE SCANNER APIs
    # ========================================================

    path(
        "products/by-barcode/<str:barcode>/",
        get_product_by_barcode,
        name="product-by-barcode",
    ),

    path(
        "products/bulk-barcode-scan/",
        bulk_barcode_scan,
        name="bulk-barcode-scan",
    ),

    path(
        "products/search-by-barcode/",
        ProductViewSet.as_view({"get": "search_by_barcode"}),
        name="search-by-barcode",
    ),

    # ========================================================
    # BARCODE PRINTING
    # ========================================================

    path(
        "print-barcode/<int:product_id>/",
        print_product_barcode,
        name="print_barcode",
    ),

    path(
        "print-barcode/from-barcode/<str:barcode>/",
        print_barcode_from_barcode,
        name="print_barcode_from_barcode",
    ),

    path(
        "print-multiple-barcodes/",
        print_multiple_barcodes,
        name="print_multiple_barcodes",
    ),

    path(
        "barcode-print-page/",
        barcode_print_page,
        name="barcode_print_page",
    ),

    # ========================================================
    # TEMPLATE UI PAGES
    # ========================================================

    path(
        "categories-ui/",
        login_required(
            TemplateView.as_view(
                template_name="inventory/categories.html"
            )
        ),
        name="categories_ui",
    ),

    path(
        "product-ui/",
        login_required(
            TemplateView.as_view(
                template_name="inventory/product.html"
            )
        ),
        name="products_ui",
    ),

    path(
        "stores-ui/",
        login_required(
            TemplateView.as_view(
                template_name="inventory/store.html"
            )
        ),
        name="stores_ui",
    ),

    path(
        "store-stocks-ui/",
        login_required(
            TemplateView.as_view(
                template_name="inventory/storestock.html"
            )
        ),
        name="store_stocks_ui",
    ),

    path(
        "stock-transactions-ui/",
        login_required(
            TemplateView.as_view(
                template_name="inventory/stocktransaction.html"
            )
        ),
        name="stock_transactions_ui",
    ),

    path(
        "stock-transfers-ui/",
        login_required(
            TemplateView.as_view(
                template_name="inventory/stocktransfer.html"
            )
        ),
        name="stock_transfers_ui",
    ),

    # ========================================================
    # DASHBOARD & REPORTS
    # ========================================================

    path(
        "dashboard/",
        dashboard_summary,
        name="admin",
    ),

    path(
        "api/dashboard/summary/",
        get_summary_data,
        name="get_summary_data",
    ),

    path(
        "reports/",
        reports_view,
        name="reports",
    ),

    path(
        "reports/sales/",
        SalesReportView.as_view(),
        name="sale-report",
    ),

    # ========================================================
    # REST API ROUTER
    # IMPORTANT:
    # Keep LAST to avoid route conflicts
    # ========================================================

    path("", include(router.urls)),
]
