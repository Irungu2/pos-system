# views.py
from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F
from django.utils import timezone
from .models import BulkRestock, BulkRestockItem, Product, Category, Store
from .serializers import (
    BulkRestockSerializer, BulkRestockDetailSerializer, 
    BulkRestockCreateSerializer, BulkRestockItemUpdateSerializer,
    BulkRestockItemResponseSerializer, ProductListSerializer,
    CategorySerializer
)
from .restock_service import BulkRestockService

# views.py - Add these class-based views for HTML pages
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.views.generic import TemplateView, ListView
from django.contrib.auth.mixins import LoginRequiredMixin
from .models import BulkRestock, Store
from .store_utils import get_current_store



class BulkRestockPageView(LoginRequiredMixin, TemplateView):
    """Main bulk restock page"""
    template_name = "restock/bulk_restock_list.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Get current store (based on your helper logic)
        current_store = get_current_store(self.request)

        # context['stores'] = Store.objects.filter(is_active=True)
        context['current_store'] = current_store

        return context


class BulkRestockCreatePageView(LoginRequiredMixin, TemplateView):
    """Step 1 & 2: Select items and create draft"""
    # template_name = "inventory/bulk_restock/.html"
    template_name = "restock/bulk_restock_create.html"
    def get_context_data(self, **kwargs):

        context = super().get_context_data(**kwargs)

        context['stores'] = Store.objects.all()

        return context

class BulkRestockEditPageView(LoginRequiredMixin, TemplateView):
    """Step 3: Edit quantities and prices"""
    template_name = "restock/bulk_restock_edit.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['restock_id'] = self.kwargs['pk']
        return context

class BulkRestockReviewPageView(LoginRequiredMixin, TemplateView):
    """Step 4: Summary review"""
    template_name = "restock/bulk_restock_review.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['restock_id'] = self.kwargs['pk']
        return context

class BulkRestockSuccessPageView(LoginRequiredMixin, TemplateView):
    """Step 5: Success page after processing"""
    template_name = "restock/bulk_restock_success.html"
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['restock_id'] = self.kwargs['pk']
        return context


        

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import BulkRestock, BulkRestockItem, Category
from .serializers import (
    BulkRestockSerializer,
    BulkRestockCreateSerializer,
    BulkRestockDetailSerializer,
    BulkRestockItemResponseSerializer
)


class BulkRestockViewSet(viewsets.ModelViewSet):
    """
    Bulk Restock Management ViewSet (Wizard Flow)

    FLOW:
    1. available_products → select items
    2. create_draft → save draft
    3. add/remove/update items → edit draft
    4. summary → review
    5. submit_review → confirm
    6. process → apply stock update
    """

    # permission_classes = [IsAuthenticated]
    # queryset = BulkRestock.objects.all().select_related(
    #     'store', 'category', 'completed_by'
    # )

    """
    Bulk Restock Management ViewSet (Wizard Flow)
    """
    
    permission_classes = [IsAuthenticated]
    queryset = BulkRestock.objects.all().select_related(
        'store', 'category', 'completed_by'
    ).order_by('-generated_at')  # Add ordering
    
    # Add filter backends
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'store', 'store__id', 'completed_by']
    search_fields = ['id', 'store__name', 'notes']
    ordering_fields = ['generated_at', 'updated_at', 'total_value']
    ordering = ['-generated_at']  # Default ordering

    # =========================================================
    # SERIALIZERS
    # =========================================================
    def get_serializer_class(self):
        if self.action == 'create':
            return BulkRestockCreateSerializer
        elif self.action in ['retrieve', 'partial_update', 'update']:
            return BulkRestockDetailSerializer
        return BulkRestockSerializer

    # =========================================================
    # 1. AVAILABLE PRODUCTS (Step 1)
    # =========================================================
    @action(detail=False, methods=['get'])
    def available_products(self, request):
        """
        Get products available for bulk restock selection
        """

        store_id = request.query_params.get('store_id')
        if not store_id:
            return Response(
                {'error': 'store_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        category_id = request.query_params.get('category_id')
        search = request.query_params.get('search')
        stock_status = request.query_params.get('stock_status')

        # pagination
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
        except ValueError:
            return Response(
                {'error': 'page and page_size must be integers'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_status = ['all', 'low_stock', 'out_of_stock', 'in_stock']

        if stock_status and stock_status not in valid_status:
            return Response(
                {'error': 'invalid stock_status', 'allowed': valid_status},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = BulkRestockService.get_products_for_restock(
            store_id=store_id,
            category_id=category_id,
            search=search,
            stock_status=stock_status,
            page=page,
            page_size=page_size
        )

        categories = Category.objects.filter(
            products__is_active=True
        ).distinct()

        product_data = []

        for product in result['products']:

            current_stock = getattr(product, 'current_stock', 0) or 0

            # FIXED stock logic
            if current_stock <= 0:
                stock = 'out_of_stock'
            elif current_stock <= product.reorder_level:
                stock = 'low_stock'
            else:
                stock = 'in_stock'

            product_data.append({
                'id': product.id,
                'sku': product.sku,
                'name': product.name,
                'category': product.category.name if product.category else 'Uncategorized',
                'category_id': product.category.id if product.category else None,
                'current_stock': current_stock,
                'selling_price': float(product.selling_price),
                'reorder_level': product.reorder_level,
                'stock_status': stock,
                'is_selected': False
            })

        return Response({
            'products': product_data,
            'categories': [
                {'id': c.id, 'name': c.name}
                for c in categories
            ],
            'pagination': {
                'current_page': result['page'],
                'page_size': result['page_size'],
                'total_items': result['total'],
                'total_pages': result['total_pages']
            },
            'filters': {
                'store_id': store_id,
                'stock_status_choices': valid_status
            }
        })

    # =========================================================
    # 2. CREATE DRAFT (Step 2)
    # =========================================================
    @action(detail=False, methods=['post'])
    def create_draft(self, request):
        """
        Create bulk restock draft
        """

        store_id = request.data.get('store')
        items = request.data.get('items', [])

        if not store_id:
            return Response(
                {'error': 'store is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not items:
            return Response(
                {'error': 'At least one item is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            restock = BulkRestockService.create_draft(
                store_id=store_id,
                data=request.data,
                user=request.user
            )

            serializer = BulkRestockDetailSerializer(restock)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 3. ADD ITEMS
    # =========================================================
    @action(detail=True, methods=['post'])
    def add_items(self, request, pk=None):

        product_ids = request.data.get('product_ids', [])

        if not product_ids:
            return Response(
                {'error': 'product_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            restock = BulkRestockService.add_items_to_restock(pk, product_ids)
            return Response(BulkRestockDetailSerializer(restock).data)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 4. REMOVE ITEM (FIXED - avoid DELETE body issue)
    # =========================================================
    @action(detail=True, methods=['post'])
    def remove_item(self, request, pk=None):
        """
        Remove item from draft (POST instead of DELETE for safety)
        """

        item_id = request.data.get('item_id')

        if not item_id:
            return Response(
                {'error': 'item_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            restock = BulkRestockService.remove_item_from_restock(pk, item_id)
            return Response(BulkRestockDetailSerializer(restock).data)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 5. UPDATE SINGLE ITEM
    # =========================================================
    @action(detail=True, methods=['patch'])
    def update_item(self, request, pk=None):

        item_id = request.data.get('item_id')

        if not item_id:
            return Response(
                {'error': 'item_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            item = BulkRestockService.update_item(
                item_id=item_id,
                new_quantity=request.data.get('new_quantity'),
                new_price=request.data.get('new_price')
            )

            return Response(BulkRestockItemResponseSerializer(item).data)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except BulkRestockItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    # =========================================================
    # 6. BULK UPDATE
    # =========================================================
    @action(detail=True, methods=['put'])
    def bulk_update_items(self, request, pk=None):

        items_data = request.data.get('items', [])

        if not items_data:
            return Response(
                {'error': 'items is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            restock = BulkRestockService.bulk_update_items(pk, items_data)
            return Response(BulkRestockDetailSerializer(restock).data)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 7. SUMMARY (Review Step)
    # =========================================================
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):

        restock = self.get_object()
        items = restock.items.select_related('product')

        summary = {
            'total_items': items.count(),
            'total_current_quantity': sum(i.current_quantity for i in items),
            'total_new_quantity': sum(i.new_quantity for i in items),
            'total_quantity_increase': sum(i.quantity_change for i in items),
            'total_current_value': sum(i.current_quantity * i.current_price for i in items),
            'total_new_value': sum(
                i.new_quantity * (i.new_price or i.current_price)
                for i in items
            ),
            'items_by_category': {}
        }

        for item in items:
            cat = item.product.category.name if item.product.category else 'Uncategorized'

            if cat not in summary['items_by_category']:
                summary['items_by_category'][cat] = {
                    'count': 0,
                    'quantity_increase': 0,
                    'value_increase': 0
                }

            summary['items_by_category'][cat]['count'] += 1
            summary['items_by_category'][cat]['quantity_increase'] += item.quantity_change

        return Response({
            'restock': BulkRestockDetailSerializer(restock).data,
            'summary': summary
        })

    # =========================================================
    # 8. SUBMIT REVIEW
    # =========================================================
    @action(detail=True, methods=['post'])
    def submit_review(self, request, pk=None):

        try:
            restock = BulkRestockService.submit_for_review(pk)
            return Response(BulkRestockDetailSerializer(restock).data)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 9. PROCESS STOCK UPDATE
    # =========================================================
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):

        try:
            restock = BulkRestockService.process_restock(pk, request.user)
            return Response(BulkRestockDetailSerializer(restock).data)

        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 10. LIST VIEWS
    # =========================================================
    @action(detail=False, methods=['get'])
    def my_restocks(self, request):

        restocks = self.get_queryset().filter(completed_by=request.user)
        return Response(self.get_serializer(restocks, many=True).data)

    @action(detail=False, methods=['get'])
    def pending_restocks(self, request):

        restocks = self.get_queryset().filter(completed=False)
        return Response(self.get_serializer(restocks, many=True).data)