from django.shortcuts import render, redirect
from django.utils.timezone import now
from apps.sales.models import Sale
from apps.inventory.models import Product, Store, StoreStock
from django.db.models import Sum, F
from apps.account.context_processors import get_logged_in_user

from apps.sales.models import Sale
from apps.inventory.models import Product, Store, StoreStock
from django.contrib.auth.decorators import login_required
from django.utils.timezone import now
from django.views.decorators.cache import never_cache

@never_cache
@login_required(login_url='/account/login/')
def dashboard_view(request):

    user = request.user  # Now Django handles the logged-in user
    today = now().date()
    print('the user is ', user)
    # Determine store access
    if user.role == 'admin':
        accessible_stores = Store.objects.all()
        sales_filter = {}
    else:
        store = Store.objects.filter(store_type="RETAIL").first()
        accessible_stores = [store] if store else []
        sales_filter = {"store": store} if store else {}

    # 1️⃣ Today's total sales
    todays_sales_total = (
        Sale.objects.filter(timestamp__date=today, **sales_filter)
        .aggregate(total=Sum('total_amount'))['total'] or 0
    )

    # 2️⃣ Today's transactions
    todays_transactions = Sale.objects.filter(
        timestamp__date=today, **sales_filter
    ).count()

    # 3️⃣ Recent sales
    recent_sales = Sale.objects.filter(**sales_filter).order_by('-timestamp')[:5]

    # 4️⃣ Low stock
    low_stock_info = []
    low_stock_total = 0
    for store in accessible_stores:
        low_stock_products = StoreStock.objects.filter(
            store=store,
            quantity__lte=F('product__reorder_level')
        ).select_related('product')

        count = low_stock_products.count()
        low_stock_total += count
        low_stock_info.append({
            "store": store,
            "count": count,
            "products": [ls.product for ls in low_stock_products],
        })

    # 5️⃣ Out-of-stock alerts
    alerts_info = []
    alerts_total = 0
    for store in accessible_stores:
        out_of_stock_products = StoreStock.objects.filter(
            store=store,
            quantity=0
        ).select_related('product')

        count = out_of_stock_products.count()
        alerts_total += count
        alerts_info.append({
            "store": store,
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
    }

    return render(request, "pos/dashboard.html", context)
