from django.shortcuts import render, redirect
from django.utils.timezone import now
from apps.sales.models import Sale
from apps.inventory.models import Product, Store, StoreStock
from django.db.models import Sum, F, Q
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.contrib import messages
from datetime import datetime

@never_cache
@login_required(login_url='/account/login/')
def dashboard_view(request):
    user = request.user
    today = now().date()
    
    # Determine store access based on role
    if user.role == 'admin':
        # Admin sees everything across all stores
        accessible_stores = Store.objects.all()
        sales_filter = {}
        show_all_sales = True
        show_sales_totals = True
        
    elif user.role == 'manager':
        # Manager sees store-level aggregates but not individual cashier specifics
        store = Store.objects.filter(store_type="RETAIL").first()
        accessible_stores = [store] if store else []
        sales_filter = {"store": store} if store else {"id__isnull": True}
        show_all_sales = True  # Managers can see all sales in their store
        show_sales_totals = True
        
    elif user.role == 'sales':
        # Sales role sees only their own sales and basic totals
        store = Store.objects.filter(store_type="RETAIL").first()
        accessible_stores = [store] if store else []
        # Critical fix: Filter sales by the logged-in user
        sales_filter = {
            "store": store,
            "sales_by": user  # Assuming Sale model has 'sales_by' field
        } if store else {"id__isnull": True}
        show_all_sales = False
        show_sales_totals = False  # Sales people shouldn't see total store sales
        
    elif user.role == 'cashier':
        # Cashier sees ONLY their own transactions
        store = Store.objects.filter(store_type="RETAIL").first()
        accessible_stores = [store] if store else []
        # Critical fix: Cashiers only see their own sales
        sales_filter = {
            "store": store,
            "sales_by": user  # IMPORTANT: Add this field to Sale model
        } if store else {"id__isnull": True}
        show_all_sales = False
        show_sales_totals = False  # Cashiers shouldn't see total sales
        
    else:
        # Fallback for unknown roles
        messages.error(request, "Invalid user role")
        return redirect('/account/login/')
    
    # 1️⃣ Today's total sales (role-appropriate)
    if show_sales_totals:
        todays_sales_total = (
            Sale.objects.filter(timestamp__date=today, **sales_filter)
            .aggregate(total=Sum('total_amount'))['total'] or 0
        )
    else:
        # For cashiers/sales: Show only their personal total
        todays_sales_total = (
            Sale.objects.filter(timestamp__date=today, cashier_id=user)
            .aggregate(total=Sum('total_amount'))['total'] or 0
        )
    
    # 2️⃣ Today's transactions (role-appropriate)
    if user.role in ['admin', 'manager']:
        todays_transactions = Sale.objects.filter(
            timestamp__date=today, **sales_filter
        ).count()
    else:
        # Cashiers/sales see only their own transaction count
        todays_transactions = Sale.objects.filter(
            timestamp__date=today, cashier_id=user
        ).count()
    
    # 3️⃣ Recent sales (CRITICAL FIX)
    if user.role in ['admin', 'manager']:
        # Admin/Manager: See recent sales from their accessible stores
        recent_sales = Sale.objects.filter(**sales_filter).order_by('-timestamp')[:5]
    else:
        # Cashier/Sales: See ONLY their own recent sales
        recent_sales = Sale.objects.filter(cashier_id=user).order_by('-timestamp')[:5]
    
    # 4️⃣ Low stock (Admin and Manager only)
    low_stock_info = []
    low_stock_total = 0
    if user.role in ['admin', 'manager']:
        for store in accessible_stores:
            low_stock_products = StoreStock.objects.filter(
                store=store,
                quantity__lte=F('product__reorder_level')
            ).select_related('product')
            
            count = low_stock_products.count()
            low_stock_total += count
            low_stock_info.append({
                "store": store.name if hasattr(store, 'name') else str(store),
                "count": count,
                "products": [ls.product for ls in low_stock_products],
            })
    
    # 5️⃣ Out-of-stock alerts (Admin and Manager only)
    alerts_info = []
    alerts_total = 0
    if user.role in ['admin', 'manager']:
        for store in accessible_stores:
            out_of_stock_products = StoreStock.objects.filter(
                store=store,
                quantity=0
            ).select_related('product')
            
            count = out_of_stock_products.count()
            alerts_total += count
            alerts_info.append({
                "store": store.name if hasattr(store, 'name') else str(store),
                "count": count,
                "products": [p.product for p in out_of_stock_products],
            })
    
    context = {
        "todays_sales": todays_sales_total,
        "transactions": todays_transactions,
        "recent_sales": recent_sales,
        "low_stock_info": low_stock_info,
        "alerts_info": alerts_info,
        "low_stock_total": low_stock_total,
        "alerts_total": alerts_total,
        "user_role": user.role,
        "show_inventory_alerts": user.role in ['admin', 'manager'],
    }
    
    return render(request, "pos/dashboard.html", context)