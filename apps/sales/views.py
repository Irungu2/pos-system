from django.shortcuts import render, get_object_or_404
from django.utils import timezone
from django.db.models import Sum, Count, F, Q
from django.http import HttpResponse, HttpResponseForbidden
from django.core.exceptions import PermissionDenied
from django.db import transaction

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Sale, SaleItem
from .serializers import (
    SaleSerializer,
    SaleSummarySerializer,
    SaleItemSerializer,
    SaleCreateSerializer
)
from apps.inventory.models import Product, Category, Store
from apps.inventory.serializers import ProductSerializer, CategorySerializer
from apps.account.models import User
from apps.account.context_processors import current_user
from django.contrib.auth.decorators import login_required

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


# def login_required(view_func):
#     """Decorator for session-based login"""
#     def wrapper(request, *args, **kwargs):
#         user = get_current_user(request)
#         if not user:
#             return HttpResponse('Please log in', status=401)
#         request.user = user
#         return view_func(request, *args, **kwargs)
#     return wrapper


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


# ---------------------------
# Template Views
# ---------------------------

# @login_required
# def sales_dashboard(request):
#     """Sales dashboard for the current user"""
#     today = timezone.now().date()
#     user = request.user

#     today_sales = Sale.objects.filter(
#         cashier=user,
#         timestamp__date=today
#     ).prefetch_related('items')

#     today_total_sales = today_sales.count()
#     today_revenue = today_sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
#     today_items_sold = SaleItem.objects.filter(sale__in=today_sales).aggregate(
#         Sum('quantity'))['quantity__sum'] or 0

#     recent_sales = today_sales.order_by('-timestamp')[:5]

#     shop = Store.objects.filter(store_type=Store.RETAIL).first()

#     low_stock_products = Product.objects.filter(
#         storestock__store=shop,
#         storestock__quantity__lte=F('reorder_level'),
#         is_active=True
#     ).distinct()[:5]

#     top_products_today = SaleItem.objects.filter(sale__in=today_sales).values(
#         'product__name'
#     ).annotate(total_sold=Sum('quantity')).order_by('-total_sold')[:5]

#     context = {
#         'today_total_sales': today_total_sales,
#         'today_revenue': today_revenue,
#         'today_items_sold': today_items_sold,
#         'recent_sales': recent_sales,
#         'low_stock_products': low_stock_products,
#         'top_products_today': top_products_today,
#         'user_role': getattr(user, 'role', None),
#         'today': today,
#     }
#     return render(request, 'sales/pos_base.html', context)


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
def my_sales(request):
    """
    Render the My Sales page.
    The actual sales data is fetched via AJAX from /sales/api/my-sales/
    """
    user = request.user
    user_role = getattr(user, 'role', 'user')  # Adjust based on your User model

    context = {
        'user_role': user_role,
    }
    return render(request, 'sales/my_sales.html', context)




@login_required(login_url='/account/login/')
def sale_detail(request, sale_id):
    """Detailed view of a sale"""
    sale = get_object_or_404(Sale, sale_id=sale_id)
    user = request.user
    if user.role in ['cashier'] and sale.cashier != user:
        raise PermissionDenied("You can only view your own sales")
    context = {'sale': sale}
    return render(request, 'sales/sale_detail.html', context)



# ---------------------------
# API Views
# ---------------------------


@api_view(['GET'])
def api_my_sales(request):
    """Return sales for the current user, or all sales for managers/admins, with pagination."""
    user = get_current_user(request)
    if not user:
        return Response({'error': 'Authentication required'}, status=401)

    date_from = request.GET.get('date_from')
    date_to = request.GET.get('date_to')

    # Role-based queryset
    if user.role in ['admin', 'manager']:
        sales = Sale.objects.all().prefetch_related('items').order_by('-timestamp')
    else:  # cashier
        sales = Sale.objects.filter(cashier=user).prefetch_related('items').order_by('-timestamp')

    if date_from:
        sales = sales.filter(timestamp__date__gte=date_from)
    if date_to:
        sales = sales.filter(timestamp__date__lte=date_to)

    # -------------------------------
    # Pagination
    # -------------------------------
    paginator = PageNumberPagination()
    paginator.page_size = 600  # default items per page
    result_page = paginator.paginate_queryset(sales, request)
    serializer = SaleSummarySerializer(result_page, many=True)
    return paginator.get_paginated_response(serializer.data)


# ---------------------------
# SALE API VIEWS
# ---------------------------
# from rest_framework.permissions import IsAuthenticated

# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def api_create_sale(request):

#     user = get_current_user(request)

#     # 🔹 Log incoming request & user info
#     print("=== Incoming Sale Request ===")
#     print("User:", user.id if user else None)
#     print("Raw Request Data:", request.data)

#     if not user:
#         return Response({'error': 'Authentication required'}, status=401)

#     data = request.data.copy()
#     data['cashier'] = user.id

#     # 🔹 Log data being passed to the serializer
#     print("Data passed to serializer:", data)
#     print("================================")

#     serializer = SaleCreateSerializer(data=data)

#     if serializer.is_valid():
#         try:
#             with transaction.atomic():
#                 sale = serializer.save()

#             # 🔹 Log successfully created sale
#             print("Sale Created:", SaleSerializer(sale).data)

#             return Response(SaleSerializer(sale).data, status=201)

#         except Exception as e:
#             print("Error during transaction:", e)  # Debug logging
#             return Response({'error': str(e)}, status=400)

#     else:
#         # 🔹 Log serializer validation errors
#         print("Serializer Errors:", serializer.errors)
#         return Response(serializer.errors, status=400)



from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_create_sale(request):
    user = request.user  # guaranteed to be authenticated
    print("=== Incoming Sale Request ===")
    print("User:", user.id)
    print("Raw Request Data:", request.data)

    data = request.data.copy()
    data['cashier'] = user.id

    serializer = SaleCreateSerializer(data=data)

    if serializer.is_valid():
        sale = serializer.save()
        print("Sale Created:", SaleSerializer(sale).data)
        return Response(SaleSerializer(sale).data, status=201)
    else:
        print("Serializer Errors:", serializer.errors)
        return Response(serializer.errors, status=400)
