from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Count, F, Q, Sum, Prefetch
from django.http import HttpResponse, HttpResponseForbidden
from django.shortcuts import get_object_or_404, render
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Sale, SaleItem, Store
from .serializers import (
    SaleCreateSerializer,
    SaleItemSerializer,
    SaleListSerializer,
    SaleSerializer,
    SaleSummarySerializer,
)

from apps.account.context_processors import current_user
from apps.account.models import User
from apps.inventory.models import Category, Product, Store
from apps.inventory.serializers import CategorySerializer, ProductSerializer
from apps.inventory.services import InventoryService
from apps.inventory.store_utils import get_current_store


User = get_user_model()
# ---------------------------
# Helper functions
# ---------------------------

def get_current_user(request):
    """Get current user from session"""
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    try:
        return User.objects.get(unique_id=user_id)
    except User.DoesNotExist:
        return None



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


# @login_required
@login_required(login_url='/account/login/')
def sales_dashboard(request):
    """Sales dashboard for the current user"""
    today = timezone.now().date()
    user = request.user

    print("\n===== DEBUG: SALES DASHBOARD =====")
    print(f"User: {user} (ID: {user.id})")
    print(f"Today's Date: {today}")

    today_sales = Sale.objects.filter(
        cashier=user,
        timestamp__date=today
    ).prefetch_related('items')

    today_total_sales = today_sales.count()
    today_revenue = today_sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    today_items_sold = SaleItem.objects.filter(sale__in=today_sales).aggregate(
        Sum('quantity'))['quantity__sum'] or 0

    print(f"Dashboard → Sales Count: {today_total_sales}")
    print(f"Dashboard → Items Sold Today: {today_items_sold}")
    print(f"Dashboard → Revenue Today: {today_revenue}")

    recent_sales = today_sales.order_by('-timestamp')[:50]
    print(f"Dashboard → Recent Sales Count: {recent_sales.count()}")

    shop = Store.objects.filter(store_type=Store.RETAIL).first()
    print(f"Dashboard → Shop Used: {shop}")

    low_stock_products = Product.objects.filter(
        storestock__store=shop,
        storestock__quantity__lte=F('reorder_level'),
        is_active=True
    ).distinct()[:5]

    print(f"Dashboard → Low Stock Products: {low_stock_products.count()}")

    top_products_today = SaleItem.objects.filter(sale__in=today_sales).values(
        'product__name'
    ).annotate(total_sold=Sum('quantity')).order_by('-total_sold')[:5]

    print(f"Dashboard → Top Products Today Count: {top_products_today.count()}")
    print("=====================================\n")

    context = {
        'today_total_sales': today_total_sales,
        'today_revenue': today_revenue,
        'today_items_sold': today_items_sold,
        'recent_sales': recent_sales,
        'low_stock_products': low_stock_products,
        'top_products_today': top_products_today,
        'user_role': getattr(user, 'role', None),
        'today': today,
    }
    print(context)
    return render(request, 'sales/pos_base.html', context)


# @login_required
@login_required(login_url='/account/login/')
def pos_interface(request):
    """POS interface"""
    products = Product.objects.filter(is_active=True).select_related('category')
    categories = Category.objects.all()
    
    context = {
        'products': products,
        'categories': categories,
        'current_time': timezone.now(),
    }
    return render(request, 'sales/pos.html', context)




@login_required(login_url='/account/login/')
def sale_detail(request, sale_id):
    """Detailed view of a sale"""
    from django.db import models
    
    sale = get_object_or_404(
        Sale.objects
        .select_related('cashier', 'store')
        .prefetch_related(
            models.Prefetch(
                'items',
                queryset=SaleItem.objects.select_related('product')
            )
        ),
        sale_id=sale_id
    )
    
    user = request.user
    if user.role == 'cashier' and sale.cashier != user:
        raise PermissionDenied("You can only view your own sales")
    
    # Get shop settings (from settings or database)
    from django.conf import settings
    shop_settings = {
        'shop_name': getattr(settings, 'SHOP_NAME', 'POS SYSTEM'),
        'address': getattr(settings, 'SHOP_ADDRESS', '123 Business St, Kenya'),
        'phone': getattr(settings, 'SHOP_PHONE', '+254 XXX XXX'),
        'currency': getattr(settings, 'CURRENCY', 'KES'),
    }
    
    context = {
        'sale': sale,
        'shop_settings': shop_settings,
        'receipt_data': sale.get_receipt_data(),  # Tax calculated per product
    }
    return render(request, 'sales/sale_detail.html', context)
# ---------------------------
# API Views
# ---------------------------



@login_required(login_url='/account/login/')
def sales_history(request):
    """
    Full POS sales history with:
    - Role-based access
    - User-store M2M filtering
    - Admin/global filtering
    """

    user = request.user

    # =========================
    # BASE QUERYSET (OPTIMIZED)
    # =========================
    sales = (
        Sale.objects
        .select_related('cashier', 'store')
        .prefetch_related(
            Prefetch(
                'items',
                queryset=SaleItem.objects.select_related('product')
            )
        )
        .annotate(items_count=Count('items'))
    )

    # =========================
    # ROLE CHECK
    # =========================
    is_admin = user.role == "admin" or user.is_superuser
    is_manager = user.role == "manager"

    # =========================
    # STORE ACCESS CONTROL (IMPORTANT FIX)
    # =========================

    if not is_admin:
        # limit sales to user's stores
        sales = sales.filter(store__in=user.stores.all())

    # =========================
    # CASHIER RESTRICTION
    # =========================
    if user.role in ["cashier", "sales"]:
        sales = sales.filter(cashier=user)

    # =========================
    # ADMIN / MANAGER FILTERS
    # =========================
    if is_admin or is_manager:

        store_id = request.GET.get("store")
        if store_id:
            sales = sales.filter(store_id=store_id)

        cashier_id = request.GET.get("cashier")
        if cashier_id:
            sales = sales.filter(cashier_id=cashier_id)

    # =========================
    # DATE FILTERS (ALL ROLES)
    # =========================
    date_from = request.GET.get("from")
    date_to = request.GET.get("to")

    if date_from:
        sales = sales.filter(timestamp__date__gte=date_from)

    if date_to:
        sales = sales.filter(timestamp__date__lte=date_to)

    # =========================
    # ORDERING
    # =========================
    sales = sales.order_by('-timestamp')

    # =========================
    # FILTER DROPDOWN DATA
    # =========================

    # stores user can access
    if is_admin:
        stores = Store.objects.all()
    else:
        stores = user.stores.all()

    # cashiers (only admin/manager see all users)
    cashiers = (
        User.objects.filter(role__in=["cashier", "sales"])
        if (is_admin or is_manager)
        else None
    )

    # =========================
    # CONTEXT
    # =========================
    context = {
        'sales': sales,
        'total_sales': sales.count(),
        'stores': stores,
        'cashiers': cashiers,
    }

    return render(request, 'sales/sales_history.html', context)
    

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_sales(request):
    sales = (
        Sale.objects
        .select_related("cashier", "store")
        .prefetch_related("items__product")
        .order_by("-timestamp")
    )

    serializer = SaleListSerializer(sales, many=True)

    return Response(
        {
            "success": True,
            "count": sales.count(),
            "data": serializer.data,
        },
        status=status.HTTP_200_OK,
    )




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_create_sale(request):
    user = request.user
    print('the data is', request.data)

    try:
        store = get_current_store(request)
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_403_FORBIDDEN
        )

    if not store:
        return Response(
            {"error": "No store selected"},
            status=status.HTTP_400_BAD_REQUEST
        )

    data = request.data.copy()
    data['cashier'] = user.id

    serializer = SaleCreateSerializer(
        data=data,
        context={'store': store, 'user': user}
    )

    if not serializer.is_valid():
        print("Serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        # ❌ NO atomic block (DEBUG MODE)

        sale = serializer.save()

        for item in serializer.validated_data['items']:
            product = Product.objects.get(id=item['product_id'])
            quantity = item['quantity']

            InventoryService.remove_stock(
                product=product,
                store=store,
                quantity=quantity,
                user=user,
                reference=f"SALE_{sale.sale_id}",
                remarks=f"Sale: {quantity} units"
            )

        return Response(
            {"success": True, "sale_id": str(sale.sale_id)},
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        print("FULL ERROR:", str(e))
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )