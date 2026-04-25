# Standard library
import json
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone

# Django core
from django.http import JsonResponse
from django.shortcuts import render
from django.views import View
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model

# Django ORM
from django.db.models import (
    Sum, Count, Avg, F, Q,
    DecimalField, Value
)
from django.db.models.functions import (
    Coalesce, TruncDate
)

# Local / app imports
from apps.account.context_processors import login_required as custom_login_required
from apps.inventory.models import Product, Category, Store
from apps.sales.models import Sale

from .models import (
    Category,
    Product,
    Store,
    StoreStock,
    StockTransaction,
    StockTransfer,
    BulkRestock,
    BulkRestockItem
)

from .reports import InventorySalesReportGenerator

# User model
User = get_user_model()



# # views.py or sales_report_views.py
# import json
# from django.shortcuts import render
# from django.http import JsonResponse
# from django.views import View
# from django.contrib.auth.decorators import login_required
# from django.utils.decorators import method_decorator
# from django.utils import timezone
# from datetime import datetime

# from apps.account.models import User
# from apps.inventory.models import Product, Category, Store
# from .reports import InventorySalesReportGenerator


# # views.py or sales_report_views.py

# import json
# from datetime import datetime, time
# from django.shortcuts import render
# from django.http import JsonResponse
# from django.views import View
# from django.contrib.auth.decorators import login_required
# from django.utils.decorators import method_decorator
# from django.utils import timezone
# from django.contrib.auth import get_user_model

# from apps.inventory.models import Product, Category, Store
# from .reports import InventorySalesReportGenerator

# # Custom User model
# User = get_user_model()
from datetime import datetime, time, date


def parse_date(date_str):
    """Helper function to parse date string into datetime.date"""
    try:
        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d %H:%M:%S'):
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        from django.utils.dateparse import parse_date as django_parse_date
        return django_parse_date(date_str)
    except Exception:
        return None


def parse_to_datetime(date_obj_or_str, start_of_day=True):
    """
    Convert a string or date/datetime object to datetime.datetime.
    start_of_day=True → 00:00:00
    start_of_day=False → 23:59:59
    """
    if not date_obj_or_str:
        return None

    # Check for datetime first
    if isinstance(date_obj_or_str, datetime):
        return date_obj_or_str

    # Check for date
    if isinstance(date_obj_or_str, date):
        t = time.min if start_of_day else time.max
        return datetime.combine(date_obj_or_str, t)

    # Assume string
    dt_date = parse_date(date_obj_or_str)
    if dt_date:
        t = time.min if start_of_day else time.max
        return datetime.combine(dt_date, t)

    return None


@login_required
def reports_view(request):
    """Render the reports page with filters"""
    context = {
        'stores': Store.objects.all(),
        'products': Product.objects.filter(is_active=True),
        'categories': Category.objects.filter(is_active=True),
        'cashiers': User.objects.filter(is_active=True),
        'today': datetime.now(),
    }
    print('the data is ',context)
    return render(request, 'reports/reports.html', context)


@method_decorator([login_required], name='dispatch')
class SalesReportView(View):

    def get(self, request):
        """GET - useful for testing"""
        return JsonResponse({
            'message': 'Sales Report API',
            'available_reports': [
                'SALES_SUMMARY',
                'PRODUCT_SALES', 
                'CASHIER_PERFORMANCE',
                'TAX_REPORT',
                'SALES_VS_STOCK',
                'CATEGORY_PROFITABILITY',
                'END_OF_DAY'
            ],
            'usage': 'Send POST request with JSON payload containing report_type and filters'
        })

    def post(self, request):
        try:
            print(f"📥 SalesReportView POST request received from {request.user}")
            print(f"📦 Request body: {request.body}")

            # Parse JSON
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError as e:
                return JsonResponse({'error': f'Invalid JSON: {str(e)}', 'received_body': str(request.body)}, status=400)

            report_type = data.get('report_type')
            filters = data.get('filters', {})

            if not report_type:
                return JsonResponse({'error': 'Missing report_type'}, status=400)

            # Parse store
            store = None
            if filters.get('store_id'):
                try:
                    store = Store.objects.filter(id=filters['store_id']).first()
                    if not store:
                        return JsonResponse({'error': f'Store with ID {filters["store_id"]} not found'}, status=404)
                except ValueError:
                    return JsonResponse({'error': 'Invalid store ID format'}, status=400)

            # Parse dates to datetime safely
            start_datetime = parse_to_datetime(filters.get('start_date'), start_of_day=True)
            end_datetime = parse_to_datetime(filters.get('end_date'), start_of_day=False)

            # Validate date range
            if start_datetime and end_datetime and start_datetime > end_datetime:
                return JsonResponse({'error': 'Start date cannot be after end date'}, status=400)

            # Create report generator
            generator = InventorySalesReportGenerator(
                store=store,
                start_date=start_datetime,
                end_date=end_datetime
            )

            # Optional filters
            cashier = None
            if filters.get("cashier_id"):
                cashier = User.objects.filter(id=filters.get("cashier_id")).first()

            product = None
            if filters.get("product_id"):
                product = Product.objects.filter(id=filters.get("product_id")).first()

            category = None
            if filters.get("category_id"):
                category = Category.objects.filter(id=filters.get("category_id")).first()

            # Generate report
            report_data = None
            try:
                if report_type == 'SALES_SUMMARY':
                    report_data = generator.generate_sales_summary_report(
                        group_by=filters.get("group_by", "daily"),
                        cashier=cashier
                    )

                elif report_type == 'PRODUCT_SALES':
                    report_data = generator.generate_product_sales_report(
                        product=product,
                        category=category,
                        top_n=int(filters.get("top_n", 20))
                    )

                elif report_type == 'CASHIER_PERFORMANCE':
                    report_data = generator.generate_cashier_performance_report()

                elif report_type == 'TAX_REPORT':
                    report_data = generator.generate_tax_report()

                elif report_type == 'SALES_VS_STOCK':
                    report_data = generator.generate_sales_vs_stock_report()

                elif report_type == 'CATEGORY_PROFITABILITY':
                    report_data = generator.generate_profitability_by_category()

                elif report_type == 'END_OF_DAY':
                    report_date = parse_to_datetime(filters.get('date'), start_of_day=True) or timezone.now()
                    report_data = generator.generate_end_of_day_report(date=report_date)

                else:
                    return JsonResponse({'error': f'Invalid report type: {report_type}'}, status=400)

            except Exception as report_error:
                print(f"❌ Error generating report {report_type}: {str(report_error)}")
                return JsonResponse({'error': f'Error generating report: {str(report_error)}', 'report_type': report_type}, status=500)

            # Build response
            response_data = {
                'success': True,
                'report': report_data,
                'request_info': {
                    'user': request.user.get_username(),
                    'timestamp': timezone.now().isoformat(),
                    'report_type': report_type
                }
            } 

            print(f"✅ Report {report_type} generated successfully")
            return JsonResponse(response_data)

        except Exception as e:
            print(f"❌ Unexpected error in SalesReportView: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'Internal server error: {str(e)}', 'type': type(e).__name__}, status=500)






@login_required
def dashboard_summary(request):
    print("hello ")
    """Main summary dashboard page"""
    return render(request, 'dashboard/summary.html')



@login_required
@require_http_methods(['GET'])
def get_summary_data(request):
    print("hello get summary")
    """Get comprehensive summary data for dashboard"""
    
    try:
        # 1. BASIC COUNTS - Optimized with single query
        print("Fetching basic counts...")
        basic_counts = {
            'total_products': Product.objects.filter(is_active=True).count(),
            'active_categories': Category.objects.filter(is_active=True).count(),
            'total_stores': Store.objects.count(),
            'total_users': User.objects.filter(is_active=True).count()
        }
        
        print(f"Basic counts: {basic_counts}")
        
        # 2. STOCK ANALYSIS - Optimized queries
        print("Analyzing stock...")
        
        # Get warehouse for warehouse stock calculation
        warehouse = Store.objects.filter(store_type=Store.WAREHOUSE).first()
        
        # Total stock value and items - optimized with aggregation
        stock_aggregates = StoreStock.objects.filter(
            product__is_active=True
        ).select_related('product').aggregate(
            total_value=Sum(F('quantity') * F('product__cost_price'), output_field=DecimalField()),
            total_items=Sum('quantity')
        )
        
        total_stock_value = stock_aggregates['total_value'] or Decimal('0')
        total_stock_items = stock_aggregates['total_items'] or 0
        
        print(f"Total stock value: {total_stock_value}, Items: {total_stock_items}")
        
        # Low stock items - optimized query
        low_stock_items = Product.objects.filter(
            is_active=True
        ).annotate(
            total_stock=Coalesce(Sum('storestock__quantity'), 0)
        ).filter(
            total_stock__lte=F('reorder_level')
        ).values(
            'name', 'sku', 
            current_stock=F('total_stock'),
            required=F('reorder_level')
        ).annotate(
            difference=F('reorder_level') - F('total_stock')
        )[:10]  # Limit to 10 items for dashboard
        
        low_stock_count = low_stock_items.count()
        print(f"Low stock items count: {low_stock_count}")
        
        # 3. SALES DATA (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        print("Fetching sales data...")
        
        # Daily sales for chart - optimized
        daily_sales = Sale.objects.filter(
            timestamp__gte=thirty_days_ago
        ).annotate(
            date=TruncDate('timestamp')
        ).values('date').annotate(
            total=Sum('total_amount'),
            count=Count('id')
        ).order_by('date')
        
        print(f"Daily sales records: {daily_sales.count()}")
        
        # Sales summary (last 30 days)
        sales_summary = Sale.objects.filter(
            timestamp__gte=thirty_days_ago
        ).aggregate(
            total_sales=Coalesce(Sum('total_amount'), Decimal('0')),
            avg_sale=Coalesce(Avg('total_amount'), Decimal('0')),
            total_transactions=Count('id')
        )
        
        # Today's sales
        today_sales = Sale.objects.filter(
            timestamp__gte=today_start
        ).aggregate(
            total=Coalesce(Sum('total_amount'), Decimal('0')),
            count=Count('id')
        )
        
        print(f"Sales summary: {sales_summary}")
        print(f"Today's sales: {today_sales}")
        
        # 4. STORE PERFORMANCE - Optimized with prefetch
        print("Analyzing store performance...")
        stores = Store.objects.prefetch_related('stocks', 'stocks__product', 'sales')
        
        store_performance = []
        for store in stores:
            # Store stock value - optimized
            store_stocks = store.stocks.all()
            store_stock_value = sum(
                stock.quantity * stock.product.cost_price 
                for stock in store_stocks
            )
            
            # Store sales (last 30 days)
            store_sales_agg = store.sales.filter(
                timestamp__gte=thirty_days_ago
            ).aggregate(
                total=Coalesce(Sum('total_amount'), Decimal('0')),
                count=Count('id')
            )
            
            # Low stock items in this store
            low_in_store = sum(
                1 for stock in store_stocks 
                if stock.quantity <= stock.product.reorder_level
            )
            
            store_performance.append({
                'id': store.id,
                'name': store.name,
                'type': store.get_store_type_display(),
                'stock_value': float(store_stock_value),
                'total_sales': float(store_sales_agg['total']),
                'sales_count': store_sales_agg['count'],
                'low_stock_items': low_in_store,
                'total_products': store_stocks.count()
            })
        
        # Sort stores by sales performance
        store_performance.sort(key=lambda x: x['total_sales'], reverse=True)
        
        print(f"Store performance count: {len(store_performance)}")
        
        # 5. RECENT ACTIVITIES (last 10 of each) - Optimized with select_related
        print("Fetching recent activities...")
        
        recent_sales = Sale.objects.select_related(
            'cashier', 'store'
        ).order_by('-timestamp')[:10]
        
        recent_transactions = StockTransaction.objects.select_related(
            'product', 'store', 'performed_by', 'transfer_to_store'
        ).order_by('-timestamp')[:10]
        
        recent_transfers = StockTransfer.objects.select_related(
            'product', 'from_store', 'to_store', 'performed_by'
        ).order_by('-created_at')[:10]
        
        print(f"Recent activities - Sales: {recent_sales.count()}, Transactions: {recent_transactions.count()}, Transfers: {recent_transfers.count()}")
        
        # 6. CATEGORY DISTRIBUTION - Optimized
        category_distribution = Category.objects.filter(
            is_active=True
        ).annotate(
            product_count=Count('products', filter=Q(products__is_active=True)),
            total_stock=Coalesce(
                Sum('products__storestock__quantity', filter=Q(products__is_active=True)), 
                0
            )
        ).filter(
            product_count__gt=0  # Only show categories with products
        ).values(
            'id', 'name', 'product_count', 'total_stock'
        ).order_by('-product_count')
        
        # 7. USER ACTIVITY - Today's performance
        print("Fetching user activity...")
        today_midnight = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        user_activity = User.objects.filter(
            is_active=True
        ).annotate(
            today_sales_count=Count(
                'sales', 
                filter=Q(sales__timestamp__gte=today_midnight)
            )
        ).order_by('-today_sales_count')[:20]  # Limit to top 20 active users
        
        # Prepare user activity data
        user_activity_data = [
            {
                'id': user.id,
                'name': user.get_full_name() or user.unique_id,
                'role': user.get_role_display(),
                'today_sales': user.today_sales_count,
                'last_login': user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Never'
            }
            for user in user_activity
        ]
        
        # 8. ADDITIONAL METRICS
        print("Calculating additional metrics...")
        
        # Revenue growth (compared to previous 30 days)
        sixty_days_ago = timezone.now() - timedelta(days=60)
        previous_month_sales = Sale.objects.filter(
            timestamp__gte=sixty_days_ago,
            timestamp__lt=thirty_days_ago
        ).aggregate(
            total=Coalesce(Sum('total_amount'), Decimal('0'))
        )['total']
        
        current_month_sales = sales_summary['total_sales']
        
        if previous_month_sales and previous_month_sales > 0:
            revenue_growth = ((current_month_sales - previous_month_sales) / previous_month_sales) * 100
        else:
            revenue_growth = 100 if current_month_sales > 0 else 0
        
        # Average daily sales
        days_in_period = min(30, daily_sales.count())
        avg_daily_sales = current_month_sales / days_in_period if days_in_period > 0 else 0
        
        # Prepare response data
        print("Preparing response data...")
        response_data = {
            'success': True,
            'timestamp': timezone.now().isoformat(),
            
            # Summary Cards Data
            'summary_cards': {
                'total_products': basic_counts['total_products'],
                'active_categories': basic_counts['active_categories'],
                'total_stores': basic_counts['total_stores'],
                'total_users': basic_counts['total_users'],
                'total_stock_value': float(total_stock_value),
                'total_stock_items': total_stock_items,
                'low_stock_count': low_stock_count,
                'today_sales_total': float(today_sales['total']),
                'today_sales_count': today_sales['count'],
                'month_sales_total': float(sales_summary['total_sales']),
                'month_transactions': sales_summary['total_transactions'],
                'avg_sale_value': float(sales_summary['avg_sale']),
                'revenue_growth_percent': float(revenue_growth),
                'avg_daily_sales': float(avg_daily_sales)
            },
            
            # Charts Data
            'charts': {
                'daily_sales': list(daily_sales),
                'category_distribution': list(category_distribution),
            },
            
            # Tables Data
            'tables': {
                'low_stock_items': list(low_stock_items),
                'store_performance': store_performance,
                'user_activity': user_activity_data,
                'recent_sales': [
                    {
                        'id': sale.id,
                        'sale_id': str(sale.sale_id)[:8],
                        'cashier': sale.cashier.get_full_name() if sale.cashier else 'Unknown',
                        'store': sale.store.name if sale.store else 'Unknown',
                        'total': float(sale.total_amount),
                        'timestamp': sale.timestamp.strftime('%Y-%m-%d %H:%M'),
                        'item_count': sale.items.count()
                    }
                    for sale in recent_sales
                ],
                'recent_transactions': [
                    {
                        'id': trans.id,
                        'product': trans.product.name if trans.product else 'Unknown',
                        'type': trans.get_transaction_type_display(),
                        'quantity': trans.quantity,
                        'store': trans.store.name if trans.store else '',
                        'to_store': trans.transfer_to_store.name if trans.transfer_to_store else '',
                        'performed_by': trans.performed_by.get_full_name() if trans.performed_by else 'System',
                        'timestamp': trans.timestamp.strftime('%Y-%m-%d %H:%M'),
                        'remarks': trans.remarks[:50] + '...' if trans.remarks and len(trans.remarks) > 50 else trans.remarks or ''
                    }
                    for trans in recent_transactions
                ],
                'recent_transfers': [
                    {
                        'id': transfer.id,
                        'product': transfer.product.name if transfer.product else 'Unknown',
                        'from_store': transfer.from_store.name if transfer.from_store else 'Unknown',
                        'to_store': transfer.to_store.name if transfer.to_store else 'Unknown',
                        'quantity': transfer.quantity,
                        'performed_by': transfer.performed_by.get_full_name() if transfer.performed_by else 'System',
                        'created_at': transfer.created_at.strftime('%Y-%m-%d %H:%M'),
                        'notes': transfer.notes[:50] + '...' if transfer.notes and len(transfer.notes) > 50 else transfer.notes or ''
                    }
                    for transfer in recent_transfers
                ]
            },
            
            # Metadata
            'metadata': {
                'data_range_days': 30,
                'as_of_date': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
                'store_count': len(store_performance),
                'low_stock_threshold': 'Reorder Level'
            }
        }
        
        print("Successfully prepared response data")
        return JsonResponse(response_data, json_dumps_params={'indent': 2})
        
    except Exception as e:
        import traceback
        error_msg = f"Error in get_summary_data: {str(e)}"
        print(error_msg)
        print(traceback.format_exc())
        
        return JsonResponse({
            'success': False,
            'error': str(e),
            'message': 'An error occurred while loading dashboard data',
            'timestamp': timezone.now().isoformat()
        }, status=500)