from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.db.models import Sum, Count, F, Q

from apps.account.models import User
# from apps.account.decorators import role_required
from apps.sales.models import Sale, SaleItem
from apps.inventory.models import Product, Store, StoreStock

from django.http import HttpResponse
# from apps.account.decorators import role_required

def get_current_user(request):
    """Get current user from session"""
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    try:
        return User.objects.get(unique_id=user_id)
    except User.DoesNotExist:
        return None


def login_required(view_func):
    """Decorator for session-based login"""
    def wrapper(request, *args, **kwargs):
        user = get_current_user(request)
        if not user:
            return HttpResponse('Please log in', status=401)
        request.user = user
        return view_func(request, *args, **kwargs)
    return wrapper


def role_required(allowed_roles):
    """Decorator to restrict view by roles"""
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            user = get_current_user(request)
            if not user:
                return HttpResponse('Please log in', status=401)
            if user.role not in allowed_roles:
                return HttpResponseForbidden("Access denied")
            request.user = user
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator




@login_required
@role_required(['admin', 'manager'])
def manager_dashboard(request):
    """Manager dashboard showing today's performance summary."""

    today = timezone.now().date()

    # ----------------------------------------------------
    # 1️⃣ Retrieve Today's Sales (prefetch for performance)
    # ----------------------------------------------------
    today_sales = (
        Sale.objects
        .filter(timestamp__date=today)
        .select_related('cashier')
        .prefetch_related('items__product')  # nested prefetch for efficiency
    )

    # ----------------------------------------------------
    # 2️⃣ Total Revenue For Today
    # ----------------------------------------------------
    today_revenue = (
        today_sales
        .aggregate(total=Sum('total_amount'))
        .get('total') or 0
    )

    # ----------------------------------------------------
    # 3️⃣ Staff Performance Summary
    # ----------------------------------------------------
    staff_performance = (
        today_sales
        .values(
            cashier_id=F('cashier__id'),
            first_name=F('cashier__first_name'),
            last_name=F('cashier__last_name'),
        )
        .annotate(
            total_sales=Count('id'),
            total_revenue=Sum('total_amount')
        )
        .order_by('-total_revenue')
    )

    # ----------------------------------------------------
    # 4️⃣ Top Products Sold Today (by revenue)
    # ----------------------------------------------------
    top_products = (
        SaleItem.objects
        .filter(sale__timestamp__date=today)
        .values(
            product_name=F('product__name'),
            product_sku=F('product__sku')
        )
        .annotate(
            total_sold=Sum('quantity'),
            revenue=Sum('subtotal')   # use subtotal (unit_price * qty + tax)
        )
        .order_by('-revenue')[:10]
    )

    # ----------------------------------------------------
    # 5️⃣ Low-Stock Products (retail only)
    # ----------------------------------------------------
    low_stock = (
        Product.objects
        .filter(
            is_active=True,
            stocks__store__store_type=Store.RETAIL,
            stocks__quantity__lte=F('reorder_level')
        )
        .annotate(total_stock=F('stocks__quantity'))
        .order_by('total_stock')[:10]
    )

    # ----------------------------------------------------
    # 6️⃣ Context for front-end/UI
    # ----------------------------------------------------
    context = {
        'today': today,
        'today_revenue': today_revenue,
        'total_transactions': today_sales.count(),
        'staff_performance': staff_performance,
        'top_products': top_products,
        'low_stock': low_stock,
    }

    return render(request, 'sales/manager_dashboard.html', context)
