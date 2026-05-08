from django.shortcuts import render, redirect
from django.utils.timezone import now
from apps.sales.models import Sale
from apps.inventory.models import Product, Store, StoreStock
from django.db.models import Sum, F, Q
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.contrib import messages
from datetime import datetime

# @never_cache
# @login_required(login_url='/account/login/')
# def dashboard_view(request):
#     user = request.user
#     today = now().date()
    
#     # Determine store access based on role
#     if user.role == 'admin':
#         # Admin sees everything across all stores
#         accessible_stores = Store.objects.all()
#         sales_filter = {}
#         show_all_sales = True
#         show_sales_totals = True
        
#     elif user.role == 'manager':
#         # Manager sees store-level aggregates but not individual cashier specifics
#         store = Store.objects.filter(store_type="RETAIL").first()
#         accessible_stores = [store] if store else []
#         sales_filter = {"store": store} if store else {"id__isnull": True}
#         show_all_sales = True  # Managers can see all sales in their store
#         show_sales_totals = True
        
#     elif user.role == 'sales':
#         # Sales role sees only their own sales and basic totals
#         store = Store.objects.filter(store_type="RETAIL").first()
#         accessible_stores = [store] if store else []
#         # Critical fix: Filter sales by the logged-in user
#         sales_filter = {
#             "store": store,
#             "sales_by": user  # Assuming Sale model has 'sales_by' field
#         } if store else {"id__isnull": True}
#         show_all_sales = False
#         show_sales_totals = False  # Sales people shouldn't see total store sales
        
#     elif user.role == 'cashier':
#         # Cashier sees ONLY their own transactions
#         store = Store.objects.filter(store_type="RETAIL").first()
#         accessible_stores = [store] if store else []
#         # Critical fix: Cashiers only see their own sales
#         sales_filter = {
#             "store": store,
#             "sales_by": user  # IMPORTANT: Add this field to Sale model
#         } if store else {"id__isnull": True}
#         show_all_sales = False
#         show_sales_totals = False  # Cashiers shouldn't see total sales
        
#     else:
#         # Fallback for unknown roles
#         messages.error(request, "Invalid user role")
#         return redirect('/account/login/')
    
#     # 1️⃣ Today's total sales (role-appropriate)
#     if show_sales_totals:
#         todays_sales_total = (
#             Sale.objects.filter(timestamp__date=today, **sales_filter)
#             .aggregate(total=Sum('total_amount'))['total'] or 0
#         )
#     else:
#         # For cashiers/sales: Show only their personal total
#         todays_sales_total = (
#             Sale.objects.filter(timestamp__date=today, cashier_id=user)
#             .aggregate(total=Sum('total_amount'))['total'] or 0
#         )
    
#     # 2️⃣ Today's transactions (role-appropriate)
#     if user.role in ['admin', 'manager']:
#         todays_transactions = Sale.objects.filter(
#             timestamp__date=today, **sales_filter
#         ).count()
#     else:
#         # Cashiers/sales see only their own transaction count
#         todays_transactions = Sale.objects.filter(
#             timestamp__date=today, cashier_id=user
#         ).count()
    
#     # 3️⃣ Recent sales (CRITICAL FIX)
#     if user.role in ['admin', 'manager']:
#         # Admin/Manager: See recent sales from their accessible stores
#         recent_sales = Sale.objects.filter(**sales_filter).order_by('-timestamp')[:5]
#     else:
#         # Cashier/Sales: See ONLY their own recent sales
#         recent_sales = Sale.objects.filter(cashier_id=user).order_by('-timestamp')[:5]
    
#     # 4️⃣ Low stock (Admin and Manager only)
#     low_stock_info = []
#     low_stock_total = 0
#     if user.role in ['admin', 'manager']:
#         for store in accessible_stores:
#             low_stock_products = StoreStock.objects.filter(
#                 store=store,
#                 quantity__lte=F('product__reorder_level')
#             ).select_related('product')
            
#             count = low_stock_products.count()
#             low_stock_total += count
#             low_stock_info.append({
#                 "store": store.name if hasattr(store, 'name') else str(store),
#                 "count": count,
#                 "products": [ls.product for ls in low_stock_products],
#             })
    
#     # 5️⃣ Out-of-stock alerts (Admin and Manager only)
#     alerts_info = []
#     alerts_total = 0
#     if user.role in ['admin', 'manager']:
#         for store in accessible_stores:
#             out_of_stock_products = StoreStock.objects.filter(
#                 store=store,
#                 quantity=0
#             ).select_related('product')
            
#             count = out_of_stock_products.count()
#             alerts_total += count
#             alerts_info.append({
#                 "store": store.name if hasattr(store, 'name') else str(store),
#                 "count": count,
#                 "products": [p.product for p in out_of_stock_products],
#             })
    
#     context = {
#         "todays_sales": todays_sales_total,
#         "transactions": todays_transactions,
#         "recent_sales": recent_sales,
#         "low_stock_info": low_stock_info,
#         "alerts_info": alerts_info,
#         "low_stock_total": low_stock_total,
#         "alerts_total": alerts_total,
#         "user_role": user.role,
#         "show_inventory_alerts": user.role in ['admin', 'manager'],
#     }
    
#     return render(request, "pos/dashboard.html", context)
from django.shortcuts import render, redirect
from django.utils.timezone import localdate
from django.db.models import Sum, Q, F
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.cache import cache
import logging

from apps.sales.models import Sale
from apps.inventory.models import Product, Store, StoreStock

logger = logging.getLogger(__name__)

# ============= HELPER FUNCTIONS =============

def get_user_store(user):
    """
    Get the appropriate store for non-admin users
    Returns Store object or None
    """
    # Option 1: If user has an assigned store field
    if hasattr(user, 'assigned_store') and user.assigned_store:
        return user.assigned_store
    
    # Option 2: If user profile has store relationship
    if hasattr(user, 'profile') and hasattr(user.profile, 'store'):
        return user.profile.store
    
    # Option 3: Fallback to first retail store
    store = Store.objects.filter(store_type="RETAIL").first()
    if not store:
        store = Store.objects.first()  # Fallback to any store
    
    return store

def get_todays_sales(user, store_ids=None):
    """
    Calculate today's total sales based on user role
    """
    today = localdate()
    
    try:
        if user.role in ['admin', 'manager']:
            # Admins and managers see all sales in their stores
            if store_ids:
                total = Sale.objects.filter(
                    timestamp__date=today,
                    store_id__in=store_ids
                ).aggregate(total=Sum('total_amount'))['total'] or 0
            else:
                total = Sale.objects.filter(
                    timestamp__date=today
                ).aggregate(total=Sum('total_amount'))['total'] or 0
        else:
            # Cashiers and sales see only their own sales
            # Try different possible field names
            try:
                total = Sale.objects.filter(
                    timestamp__date=today,
                    created_by=user
                ).aggregate(total=Sum('total_amount'))['total'] or 0
            except:
                try:
                    total = Sale.objects.filter(
                        timestamp__date=today,
                        cashier=user
                    ).aggregate(total=Sum('total_amount'))['total'] or 0
                except:
                    total = Sale.objects.filter(
                        timestamp__date=today,
                        user=user
                    ).aggregate(total=Sum('total_amount'))['total'] or 0
    except Exception as e:
        logger.warning(f"Error calculating sales for user {user.id}: {e}")
        total = 0
    
    return float(total)

def get_transaction_count(user, store_ids=None):
    """
    Get today's transaction count based on user role
    """
    today = localdate()
    
    try:
        if user.role in ['admin', 'manager']:
            if store_ids:
                count = Sale.objects.filter(
                    timestamp__date=today,
                    store_id__in=store_ids
                ).count()
            else:
                count = Sale.objects.filter(
                    timestamp__date=today
                ).count()
        else:
            # Cashiers and sales see only their own transactions
            try:
                count = Sale.objects.filter(
                    timestamp__date=today,
                    created_by=user
                ).count()
            except:
                try:
                    count = Sale.objects.filter(
                        timestamp__date=today,
                        cashier=user
                    ).count()
                except:
                    count = Sale.objects.filter(
                        timestamp__date=today,
                        user=user
                    ).count()
    except Exception as e:
        logger.warning(f"Error counting transactions for user {user.id}: {e}")
        count = 0
    
    return count

def get_recent_sales(user, store_ids=None, limit=5):
    """
    Get recent sales based on user role
    """
    try:
        if user.role in ['admin', 'manager']:
            if store_ids:
                sales = Sale.objects.filter(
                    store_id__in=store_ids
                ).select_related('store').order_by('-timestamp')[:limit]
            else:
                sales = Sale.objects.all().select_related('store').order_by('-timestamp')[:limit]
        else:
            # Cashiers and sales see only their own sales
            try:
                sales = Sale.objects.filter(
                    created_by=user
                ).select_related('store').order_by('-timestamp')[:limit]
            except:
                try:
                    sales = Sale.objects.filter(
                        cashier=user
                    ).select_related('store').order_by('-timestamp')[:limit]
                except:
                    sales = Sale.objects.filter(
                        user=user
                    ).select_related('store').order_by('-timestamp')[:limit]
    except Exception as e:
        logger.warning(f"Error getting recent sales for user {user.id}: {e}")
        sales = []
    
    return sales

def get_fallback_context(user):
    """
    Return minimal context when dashboard fails to load
    """
    return {
        'todays_sales': 0.00,
        'transactions': 0,
        'recent_sales': [],
        'low_stock_products': [],
        'out_of_stock_products': [],
        'low_stock_total': 0,
        'alerts_total': 0,
        'user_role': user.role,
        'show_inventory_alerts': user.role in ['admin', 'manager'],
        'show_sales_totals': user.role in ['admin', 'manager'],
        'show_transaction_counts': user.role in ['admin', 'manager'],
        'dashboard_error': True,
    }

# ============= MAIN DASHBOARD VIEW =============

@login_required
def dashboard_view(request):
    user = request.user
    
    # Cache key based on user and role
    cache_key = f'dashboard_{user.id}_{user.role}_{localdate()}'
    cached_context = cache.get(cache_key)
    
    if cached_context:
        return render(request, "pos/dashboard.html", cached_context)
    
    try:
        # Get user's accessible stores - FIXED: removed is_active filter
        if user.role == 'admin':
            # Admin sees all stores (no is_active filter)
            stores = Store.objects.all()
            store_ids = list(stores.values_list('id', flat=True))
        else:
            user_store = get_user_store(user)
            if user_store:
                stores = [user_store]
                store_ids = [user_store.id]
            else:
                stores = []
                store_ids = []
        
        # Query for stock status (Admin/Manager only)
        low_stock_products = []
        out_of_stock_products = []
        low_stock_total = 0
        alerts_total = 0
        
        if user.role in ['admin', 'manager'] and store_ids:
            # Get all stock status in one query
            stock_status = StoreStock.objects.filter(
                store_id__in=store_ids
            ).select_related('product', 'store')
            
            # Separate low stock and out of stock
            for stock in stock_status:
                if stock.quantity == 0:
                    out_of_stock_products.append(stock)
                    alerts_total += 1
                elif stock.product.reorder_level and stock.quantity <= stock.product.reorder_level:
                    low_stock_products.append(stock)
                    low_stock_total += 1
        
        # Get sales data
        todays_sales = get_todays_sales(user, store_ids if store_ids else None)
        transactions = get_transaction_count(user, store_ids if store_ids else None)
        recent_sales = get_recent_sales(user, store_ids if store_ids else None)
        
        # Build context
        context = {
            'todays_sales': todays_sales,
            'transactions': transactions,
            'recent_sales': recent_sales,
            'low_stock_products': low_stock_products,
            'out_of_stock_products': out_of_stock_products,
            'low_stock_total': low_stock_total,
            'alerts_total': alerts_total,
            'user_role': user.role,
            'show_inventory_alerts': user.role in ['admin', 'manager'],
            'show_sales_totals': user.role in ['admin', 'manager'],
            'show_transaction_counts': user.role in ['admin', 'manager'],
            'dashboard_error': False,
        }
        
        # Cache for 2 minutes
        cache.set(cache_key, context, 120)
        
    except Exception as e:
        logger.error(f"Dashboard error for user {user.id}: {e}", exc_info=True)
        messages.error(request, "Unable to load complete dashboard data. Showing limited view.")
        context = get_fallback_context(user)
    
    return render(request, "pos/dashboard.html", context)