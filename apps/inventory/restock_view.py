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



from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Q, F
from decimal import Decimal

from apps.inventory.models import (
    BulkRestock,
    Store,
    Category,
)


class BulkRestockPageView(LoginRequiredMixin, TemplateView):
    """
    Main bulk restock dashboard
    """

    template_name = "restock/bulk_restock_list.html"

    def get_context_data(self, **kwargs):

        print("\n" + "=" * 60)
        print("[PAGE VIEW] BulkRestockPageView - START")
        print("=" * 60)

        context = super().get_context_data(**kwargs)

        current_store = get_current_store(self.request)

        context['current_store'] = current_store

        total_restocks = 0
        pending_restocks = 0
        completed_restocks = 0

        if current_store:

            total_restocks = BulkRestock.objects.filter(
                store=current_store
            ).count()

            pending_restocks = BulkRestock.objects.filter(
                store=current_store,
                completed=False
            ).count()

            completed_restocks = BulkRestock.objects.filter(
                store=current_store,
                completed=True
            ).count()

        context['total_restocks'] = total_restocks
        context['pending_restocks'] = pending_restocks
        context['completed_restocks'] = completed_restocks

        print(
            f"[DEBUG] Totals => "
            f"total={total_restocks}, "
            f"pending={pending_restocks}, "
            f"completed={completed_restocks}"
        )

        print("=" * 60)
        print("[PAGE VIEW] BulkRestockPageView - END")
        print("=" * 60 + "\n")

        return context


class BulkRestockCreatePageView(LoginRequiredMixin, TemplateView):
    """
    Create bulk restock draft
    """

    template_name = "restock/bulk_restock_create.html"

    def get_context_data(self, **kwargs):

        print("\n" + "=" * 60)
        print("[PAGE VIEW] BulkRestockCreatePageView - START")
        print("=" * 60)

        context = super().get_context_data(**kwargs)

        stores = (
            Store.objects.filter(is_active=True)
            if hasattr(Store, 'is_active')
            else Store.objects.all()
        )

        categories = (
            Category.objects.filter(is_active=True)
            if hasattr(Category, 'is_active')
            else Category.objects.all()
        )

        current_store = get_current_store(self.request)

        existing_draft = None

        if current_store:

            existing_draft = BulkRestock.objects.filter(
                store=current_store,
                status='draft',
                completed=False
            ).first()

        context.update({
            'stores': stores,
            'categories': categories,
            'current_store': current_store,
            'existing_draft_id': (
                existing_draft.id
                if existing_draft else None
            ),
            'api_endpoints': {
                'available_products':
                    '/api/bulk-restock/available_products/',
                'create_draft':
                    '/api/bulk-restock/create_draft/',
            }
        })

        print("=" * 60)
        print("[PAGE VIEW] BulkRestockCreatePageView - END")
        print("=" * 60 + "\n")

        return context


class BulkRestockEditPageView(LoginRequiredMixin, TemplateView):
    """
    Edit quantities/prices
    """

    template_name = "restock/bulk_restock_edit.html"

    def get_context_data(self, **kwargs):

        print("\n" + "=" * 60)
        print("[PAGE VIEW] BulkRestockEditPageView - START")
        print("=" * 60)

        context = super().get_context_data(**kwargs)

        restock_id = self.kwargs['pk']

        context['restock_id'] = restock_id

        try:

            # restock = (
            #     BulkRestock.objects
            #     .select_related('store', 'completed_by')
            #     .prefetch_related('items__product')
            #     .get(id=restock_id)
            # )
            restock = (
                BulkRestock.objects
                .select_related('store', 'completed_by')
                .prefetch_related('items__product')
                .get(id=restock_id)
            )

            print(f"[DEBUG] Restock ID: {restock.id}")
            print(f"[DEBUG] Restock Status: {restock.status}")
            print(f"[DEBUG] Restock Completed: {restock.completed}")
            print(f"[DEBUG] Completed By: {restock.completed_by}")
            print(f"[DEBUG] Items Count: {restock.items.count()}")

            if restock.completed:

                context['is_editable'] = False

                context['error_message'] = (
                    "This restock has already "
                    "been processed."
                )

            elif restock.status not in ['draft', 'editing']:

                context['is_editable'] = False

                context['error_message'] = (
                    f"Cannot edit restock in "
                    f"'{restock.status}' status."
                )

            else:

                context['is_editable'] = True

            items = restock.items.all()

            # ------------------------------------------
            # TOTAL VALUE OF STOCK BEING ADDED
            # ------------------------------------------

            total_added_stock_value = sum(
                (item.new_quantity or 0) *
                (
                    item.new_price
                    or item.current_price
                    or 0
                )
                for item in items
            )

            context.update({
                'store_name': restock.store.name,
                'restock_status': restock.status,
                'item_count': items.count(),
                'total_added_stock_value':
                    total_added_stock_value,
            })

        except BulkRestock.DoesNotExist:

            context['is_editable'] = False

            context['error_message'] = (
                f"Restock {restock_id} not found."
            )

        except Exception as e:

            import traceback
            traceback.print_exc()

            context['is_editable'] = False

            context['error_message'] = str(e)

        context['api_endpoints'] = {
            'get_restock':
                f'/api/bulk-restock/{restock_id}/',

            'add_items':
                f'/api/bulk-restock/{restock_id}/add_items/',

            'remove_item':
                f'/api/bulk-restock/{restock_id}/remove_item/',

            'update_item':
                f'/api/bulk-restock/{restock_id}/update_item/',

            'bulk_update':
                f'/api/bulk-restock/{restock_id}/bulk_update_items/',

            'summary':
                f'/api/bulk-restock/{restock_id}/summary/',
        }

        print("=" * 60)
        print("[PAGE VIEW] BulkRestockEditPageView - END")
        print("=" * 60 + "\n")

        return context



class BulkRestockReviewPageView(LoginRequiredMixin, TemplateView):
    """
    Review restock before processing
    """

    template_name = "restock/bulk_restock_review.html"

    def get_context_data(self, **kwargs):

        print("\n" + "=" * 60)
        print("[PAGE VIEW] BulkRestockReviewPageView - START")
        print("=" * 60)

        context = super().get_context_data(**kwargs)

        restock_id = self.kwargs['pk']

        context['restock_id'] = restock_id

        try:

            restock = (
                BulkRestock.objects
                .select_related('store', 'completed_by')
                .prefetch_related('items__product')
                .get(id=restock_id)
            )

            print(
                f"[DEBUG] Restock found - "
                f"Status: {restock.status}"
            )

            # ---------------------------------------------------
            # STATUS HANDLING
            # ---------------------------------------------------

            if restock.completed:

                print(
                    f"[INFO] Restock "
                    f"{restock.id} already completed"
                )

                context['can_submit'] = False

                context['warning_message'] = (
                    "This restock has already "
                    "been processed."
                )

            elif restock.status in ['draft', 'editing']:

                print(
                    f"[INFO] Restock "
                    f"{restock.id} ready for review"
                )

                context['can_submit'] = True

                context['needs_submit'] = True

                context['info_message'] = (
                    "Please review and submit "
                    "for processing."
                )

            elif restock.status == 'reviewed':

                print(
                    f"[INFO] Restock "
                    f"{restock.id} reviewed"
                )

                context['can_submit'] = True

                context['needs_submit'] = False

                context['info_message'] = (
                    "Restock is ready for processing."
                )

            elif restock.status == 'processing':

                print(
                    f"[INFO] Restock "
                    f"{restock.id} processing"
                )

                context['can_submit'] = False

                context['warning_message'] = (
                    "Restock is currently processing."
                )

            else:

                print(
                    f"[WARNING] Invalid status: "
                    f"{restock.status}"
                )

                context['can_submit'] = False

                context['warning_message'] = (
                    f"Cannot review restock in "
                    f"'{restock.status}' status."
                )

            # ---------------------------------------------------
            # ITEMS
            # ---------------------------------------------------

            items = restock.items.select_related(
                'product'
            )

            # ---------------------------------------------------
            # QUANTITY ADDED ONLY
            # Example:
            # current = 30
            # added = 5
            # final = 35
            # ---------------------------------------------------

            total_quantity_increase = sum(
                item.new_quantity or 0
                for item in items
            )

            # ---------------------------------------------------
            # CURRENT INVENTORY VALUE
            # Example:
            # 30 × 60
            # ---------------------------------------------------

            total_current_value = sum(
                (item.current_quantity or 0)
                * (item.current_price or 0)
                for item in items
            )

            # ---------------------------------------------------
            # FINAL INVENTORY VALUE
            # Example:
            # (30 + 5) × 65
            # ---------------------------------------------------

            total_new_value = sum(
                (
                    (item.current_quantity or 0)
                    + (item.new_quantity or 0)
                ) * (
                    item.new_price
                    or item.current_price
                    or 0
                )
                for item in items
            )

            # ---------------------------------------------------
            # VALUE DIFFERENCE
            # ---------------------------------------------------

            total_value_increase = (
                total_new_value
                - total_current_value
            )

            # ---------------------------------------------------
            # FINAL QUANTITY
            # ---------------------------------------------------

            total_final_quantity = sum(
                (item.current_quantity or 0)
                + (item.new_quantity or 0)
                for item in items
            )

            print("[DEBUG] Review Summary")

            print(
                f"  - Total items: {items.count()}"
            )

            print(
                f"  - Quantity added: "
                f"{total_quantity_increase}"
            )

            print(
                f"  - Final quantity: "
                f"{total_final_quantity}"
            )

            print(
                f"  - Current value: "
                f"{total_current_value}"
            )

            print(
                f"  - Final value: "
                f"{total_new_value}"
            )

            print(
                f"  - Value increase: "
                f"{total_value_increase}"
            )

            # ---------------------------------------------------
            # CONTEXT
            # ---------------------------------------------------

            context.update({

                'total_items':
                    items.count(),

                # Added stock only
                'total_quantity_increase':
                    total_quantity_increase,

                # Final stock after processing
                'total_final_quantity':
                    total_final_quantity,

                # Values
                'total_current_value':
                    total_current_value,

                'total_new_value':
                    total_new_value,

                # Difference
                'total_value_increase':
                    total_value_increase,

                'store_name':
                    restock.store.name,

                'restock_status':
                    restock.status,

                'created_at':
                    restock.generated_at,

                'updated_at':
                    restock.generated_at,
            })

        # ---------------------------------------------------
        # NOT FOUND
        # ---------------------------------------------------

        except BulkRestock.DoesNotExist:

            print(
                f"[ERROR] Restock "
                f"{restock_id} not found"
            )

            context['can_submit'] = False

            context['error_message'] = (
                f"Restock {restock_id} not found."
            )

        # ---------------------------------------------------
        # GENERAL ERROR
        # ---------------------------------------------------

        except Exception as e:

            print(
                f"[ERROR] Exception: {str(e)}"
            )

            import traceback
            traceback.print_exc()

            context['can_submit'] = False

            context['error_message'] = str(e)

        # ---------------------------------------------------
        # API ENDPOINTS
        # ---------------------------------------------------

        context['api_endpoints'] = {

            'get_restock':
                f'/api/bulk-restock/{restock_id}/',

            'summary':
                f'/api/bulk-restock/{restock_id}/summary/',

            'submit_review':
                f'/api/bulk-restock/{restock_id}/submit_review/',

            'process':
                f'/api/bulk-restock/{restock_id}/process/',
        }

        print(
            f"[DEBUG] Template: "
            f"{self.template_name}"
        )

        print("=" * 60)
        print("[PAGE VIEW] BulkRestockReviewPageView - END")
        print("=" * 60 + "\n")

        return context



class BulkRestockSuccessPageView(LoginRequiredMixin, TemplateView):
    """
    Success page after processing
    """

    template_name = "restock/bulk_restock_success.html"

    def get_context_data(self, **kwargs):
        print("\n" + "=" * 60)
        print("[PAGE VIEW] BulkRestockSuccessPageView - START")
        print("=" * 60)

        context = super().get_context_data(**kwargs)

        restock_id = self.kwargs['pk']
        context['restock_id'] = restock_id

        try:
            restock = (
                BulkRestock.objects
                .select_related('store', 'completed_by')
                .prefetch_related('items__product')
                .get(id=restock_id)
            )

            print(f"[DEBUG] Restock found - Status: {restock.status}")

            # ---------------------------------------------------
            # SUCCESS CASE
            # ---------------------------------------------------
            if restock.completed:

                print(f"[SUCCESS] Restock {restock.id} completed")

                items = restock.items.all()

                # ✅ SINGLE SOURCE OF TRUTH
                summary = restock.get_summary()

                print("[DEBUG] Success Summary")
                print(f"  - Items updated: {items.count()}")
                print(f"  - Quantity added: {summary['total_quantity_added']}")
                print(f"  - Current value: {summary['total_current_value']}")
                print(f"  - Final value: {summary['total_final_value']}")
                print(f"  - Value increase: {summary['total_value_added']}")

                context.update({
                    'is_completed': True,
                    'success_message': "Stock update completed successfully!",

                    'total_items_updated': items.count(),

                    # ✅ from model (single source of truth)
                    'total_quantity_added': summary['total_quantity_added'],
                    'total_current_value': summary['total_current_value'],
                    'total_final_value': summary['total_final_value'],
                    'total_value_added': summary['total_value_added'],

                    'store_name': restock.store.name,
                    'completed_by': (
                        restock.completed_by.first_name
                        if restock.completed_by
                        else 'System'
                    ),
                    'completed_at': restock.completed_at,
                    'generated_at': restock.generated_at,
                    'restock_status': restock.status,
                })

            # ---------------------------------------------------
            # NOT COMPLETED
            # ---------------------------------------------------
            else:
                print(f"[WARNING] Restock {restock.id} not completed")

                context['is_completed'] = False
                context['warning_message'] = (
                    "This restock has not been processed yet."
                )

                context['store_name'] = (
                    restock.store.name if restock.store else 'Unknown'
                )

                context['restock_status'] = restock.status

        # ---------------------------------------------------
        # NOT FOUND
        # ---------------------------------------------------
        except BulkRestock.DoesNotExist:
            print(f"[ERROR] Restock {restock_id} not found")

            context['is_completed'] = False
            context['error_message'] = f"Restock {restock_id} not found."

        # ---------------------------------------------------
        # GENERAL ERROR
        # ---------------------------------------------------
        except Exception as e:
            print(f"[ERROR] Exception: {str(e)}")
            import traceback
            traceback.print_exc()

            context['is_completed'] = False
            context['error_message'] = str(e)

        # ---------------------------------------------------
        # ACTIONS
        # ---------------------------------------------------
        context['suggested_actions'] = [
            {'name': 'Create Another Restock', 'url': '/restock/create/'},
            {'name': 'View All Restocks', 'url': '/restock/'},
            {'name': 'View Inventory', 'url': '/inventory/'},
        ]

        print(f"[DEBUG] Template: {self.template_name}")
        print("=" * 60)
        print("[PAGE VIEW] BulkRestockSuccessPageView - END")
        print("=" * 60 + "\n")

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

    permission_classes = [IsAuthenticated]
    queryset = BulkRestock.objects.all().select_related(
        'store', 'category', 'completed_by'
    ).order_by('-generated_at')
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'store', 'store__id', 'completed_by']
    search_fields = ['id', 'store__name', 'notes']
    ordering_fields = ['generated_at', 'updated_at', 'total_value']
    ordering = ['-generated_at']

    # =========================================================
    # SERIALIZERS
    # =========================================================
    def get_serializer_class(self):
        print(f"\n[DEBUG] get_serializer_class called - action: {self.action}")
        if self.action == 'create':
            print("[DEBUG] Using BulkRestockCreateSerializer")
            return BulkRestockCreateSerializer
        elif self.action in ['retrieve', 'partial_update', 'update']:
            print("[DEBUG] Using BulkRestockDetailSerializer")
            return BulkRestockDetailSerializer
        print("[DEBUG] Using BulkRestockSerializer")
        return BulkRestockSerializer

    # =========================================================
    # 1. AVAILABLE PRODUCTS (Step 1)
    # =========================================================
    @action(detail=False, methods=['get'])
    def available_products(self, request):
        """
        Get products available for bulk restock selection
        """
        print("\n" + "="*60)
        print("[STEP 1] available_products - START")
        print("="*60)
        
        store_id = request.query_params.get('store_id')
        print(f"[DEBUG] Request params - store_id: {store_id}")
        
        if not store_id:
            print("[ERROR] store_id is missing")
            return Response(
                {'error': 'store_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        category_id = request.query_params.get('category_id')
        search = request.query_params.get('search')
        stock_status = request.query_params.get('stock_status')
        
        print(f"[DEBUG] Filters - category_id: {category_id}, search: {search}, stock_status: {stock_status}")

        # pagination
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            print(f"[DEBUG] Pagination - page: {page}, page_size: {page_size}")
        except ValueError:
            print("[ERROR] Invalid pagination parameters")
            return Response(
                {'error': 'page and page_size must be integers'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_status = ['all', 'low_stock', 'out_of_stock', 'in_stock']

        if stock_status and stock_status not in valid_status:
            print(f"[ERROR] Invalid stock_status: {stock_status}")
            return Response(
                {'error': 'invalid stock_status', 'allowed': valid_status},
                status=status.HTTP_400_BAD_REQUEST
            )

        print("[DEBUG] Calling BulkRestockService.get_products_for_restock...")
        result = BulkRestockService.get_products_for_restock(
            store_id=store_id,
            category_id=category_id,
            search=search,
            stock_status=stock_status,
            page=page,
            page_size=page_size
        )
        print(f"[DEBUG] Service returned - total products: {result.get('total', 0)}, page: {result.get('page')}, total_pages: {result.get('total_pages')}")

        print("[DEBUG] Fetching categories...")
        categories = Category.objects.filter(
            products__is_active=True
        ).distinct()
        print(f"[DEBUG] Found {categories.count()} categories")

        product_data = []
        print("[DEBUG] Processing products...")
        for idx, product in enumerate(result['products'], 1):
            current_stock = getattr(product, 'current_stock', 0) or 0

            # FIXED stock logic
            if current_stock <= 0:
                stock = 'out_of_stock'
            elif current_stock <= product.reorder_level:
                stock = 'low_stock'
            else:
                stock = 'in_stock'
            
            if idx <= 5:  # Print first 5 products for debugging
                print(f"[DEBUG] Product {idx}: {product.name} - stock: {current_stock}, status: {stock}")

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

        response_data = {
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
        }
        
        print(f"[DEBUG] Response prepared - products count: {len(product_data)}")
        print("="*60)
        print("[STEP 1] available_products - END")
        print("="*60 + "\n")
        
        return Response(response_data)


    @action(detail=False, methods=['post'])
    def create_draft(self, request):
        """
        Create bulk restock draft
        """

        store_id = request.data.get('store')
        items = request.data.get('items', [])

        # ONLY DATA PRINTS
        # print("[create_draft] store_id:", store_id)
        # print("[create_draft] items_count:", len(items))
        # print("[create_draft] items:", items)

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
            print("[create_draft] sending_to_service:", {
                "store_id": store_id,
                "items": items
            })

            restock = BulkRestockService.create_draft(
                store_id=store_id,
                data=request.data,
                user=request.user
            )

            # print("[create_draft] created_restock_id:", restock.id)
            # print("[create_draft] status:", restock.status)

            serializer = BulkRestockDetailSerializer(restock)

            # print("[create_draft] response_data:", serializer.data)

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print("[create_draft] error:", str(e))
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 3. ADD ITEMS
    # =========================================================
    @action(detail=True, methods=['post'])
    def add_items(self, request, pk=None):
        """
        Add items to existing draft
        """
        print("\n" + "="*60)
        print(f"[STEP 3] add_items - START (Restock ID: {pk})")
        print("="*60)

        product_ids = request.data.get('product_ids', [])
        print(f"[DEBUG] Product IDs to add: {product_ids}")
        print(f"[DEBUG] Number of products to add: {len(product_ids)}")

        if not product_ids:
            print("[ERROR] product_ids is required")
            return Response(
                {'error': 'product_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            print(f"[DEBUG] Calling BulkRestockService.add_items_to_restock for restock {pk}...")
            restock = BulkRestockService.add_items_to_restock(pk, product_ids)
            print(f"[DEBUG] Items added successfully. Total items now: {restock.items.count()}")
            
            serializer = BulkRestockDetailSerializer(restock)
            print("="*60)
            print("[STEP 3] add_items - END")
            print("="*60 + "\n")
            
            return Response(serializer.data)

        except ValueError as e:
            print(f"[ERROR] ValueError in add_items: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 4. REMOVE ITEM (FIXED - avoid DELETE body issue)
    # =========================================================
    @action(detail=True, methods=['post'])
    def remove_item(self, request, pk=None):
        """
        Remove item from draft (POST instead of DELETE for safety)
        """
        print("\n" + "="*60)
        print(f"[STEP 4] remove_item - START (Restock ID: {pk})")
        print("="*60)

        item_id = request.data.get('item_id')
        print(f"[DEBUG] Item ID to remove: {item_id}")

        if not item_id:
            print("[ERROR] item_id is required")
            return Response(
                {'error': 'item_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            print(f"[DEBUG] Calling BulkRestockService.remove_item_from_restock for restock {pk}, item {item_id}...")
            restock = BulkRestockService.remove_item_from_restock(pk, item_id)
            print(f"[DEBUG] Item removed successfully. Remaining items: {restock.items.count()}")
            
            serializer = BulkRestockDetailSerializer(restock)
            print("="*60)
            print("[STEP 4] remove_item - END")
            print("="*60 + "\n")
            
            return Response(serializer.data)

        except ValueError as e:
            print(f"[ERROR] ValueError in remove_item: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 5. UPDATE SINGLE ITEM
    # =========================================================
    @action(detail=True, methods=['patch'])
    def update_item(self, request, pk=None):
        """
        Update a single item in the draft
        """
        print("\n" + "="*60)
        print(f"[STEP 5] update_item - START (Restock ID: {pk})")
        print("="*60)

        item_id = request.data.get('item_id')
        new_quantity = request.data.get('new_quantity')
        new_price = request.data.get('new_price')
        
        print(f"[DEBUG] Updating item {item_id} - new_quantity: {new_quantity}, new_price: {new_price}")

        if not item_id:
            print("[ERROR] item_id is required")
            return Response(
                {'error': 'item_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            print(f"[DEBUG] Calling BulkRestockService.update_item...")
            item = BulkRestockService.update_item(
                item_id=item_id,
                new_quantity=new_quantity,
                new_price=new_price
            )
            print(f"[DEBUG] Item updated successfully - New quantity: {item.new_quantity}, Price: {item.new_price or item.current_price}")

            serializer = BulkRestockItemResponseSerializer(item)
            print("="*60)
            print("[STEP 5] update_item - END")
            print("="*60 + "\n")
            
            return Response(serializer.data)

        except ValueError as e:
            print(f"[ERROR] ValueError in update_item: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except BulkRestockItem.DoesNotExist:
            print(f"[ERROR] Item {item_id} not found")
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    # =========================================================
    # 6. BULK UPDATE
    # =========================================================
    @action(detail=True, methods=['put'])
    def bulk_update_items(self, request, pk=None):
        """
        Bulk update multiple items at once
        """
        print("\n" + "="*60)
        print(f"[STEP 6] bulk_update_items - START (Restock ID: {pk})")
        print("="*60)

        items_data = request.data.get('items', [])
        print(f"[DEBUG] Items data count: {len(items_data)}")
        if items_data:
            print(f"[DEBUG] First item update sample: {items_data[0] if items_data else 'None'}")

        if not items_data:
            print("[ERROR] items is required")
            return Response(
                {'error': 'items is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            print(f"[DEBUG] Calling BulkRestockService.bulk_update_items for restock {pk}...")
            restock = BulkRestockService.bulk_update_items(pk, items_data)
            print(f"[DEBUG] Bulk update completed successfully")
            
            serializer = BulkRestockDetailSerializer(restock)
            print("="*60)
            print("[STEP 6] bulk_update_items - END")
            print("="*60 + "\n")
            
            return Response(serializer.data)

        except ValueError as e:
            print(f"[ERROR] ValueError in bulk_update_items: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """
        Get summary of the restock draft
        """

        restock = self.get_object()

        items = restock.items.select_related('product')

        summary = {
            # Total unique products
            'total_items': items.count(),

            # Current stock before restock
            'total_current_quantity': sum(
                item.current_quantity or 0
                for item in items
            ),

            # Quantity being ADDED
            'total_quantity_added': sum(
                item.new_quantity or 0
                for item in items
            ),

            # Final stock after processing
            'total_final_quantity': sum(
                (item.current_quantity or 0)
                + (item.new_quantity or 0)
                for item in items
            ),

            # Current inventory value
            'total_current_value': sum(
                (item.current_quantity or 0)
                * (item.current_price or 0)
                for item in items
            ),

            # Final inventory value
            'total_final_value': sum(
                (
                    (item.current_quantity or 0)
                    + (item.new_quantity or 0)
                ) * (
                    item.new_price
                    or item.current_price
                    or 0
                )
                for item in items
            ),

            'items_by_category': {}
        }

        # Value increase
        summary['total_value_increase'] = (
            summary['total_final_value']
            - summary['total_current_value']
        )

        # ---------------------------------------------------
        # CATEGORY BREAKDOWN
        # ---------------------------------------------------
        for item in items:

            cat = (
                item.product.category.name
                if item.product.category
                else 'Uncategorized'
            )

            if cat not in summary['items_by_category']:
                summary['items_by_category'][cat] = {
                    'count': 0,
                    'quantity_added': 0,
                    'final_quantity': 0,
                    'value_increase': 0
                }

            summary['items_by_category'][cat]['count'] += 1

            # Added quantity
            summary['items_by_category'][cat]['quantity_added'] += (
                item.new_quantity or 0
            )

            # Final quantity
            summary['items_by_category'][cat]['final_quantity'] += (
                (item.current_quantity or 0)
                + (item.new_quantity or 0)
            )

            # Value increase
            current_value = (
                (item.current_quantity or 0)
                * (item.current_price or 0)
            )

            final_value = (
                (
                    (item.current_quantity or 0)
                    + (item.new_quantity or 0)
                ) * (
                    item.new_price
                    or item.current_price
                    or 0
                )
            )

            summary['items_by_category'][cat]['value_increase'] += (
                final_value - current_value
            )

        response_data = {
            'restock': BulkRestockDetailSerializer(restock).data,
            'summary': summary
        }

        return Response(response_data)

    # =========================================================
    # 8. SUBMIT REVIEW
    # =========================================================
    @action(detail=True, methods=['post'])
    def submit_review(self, request, pk=None):
        """
        Submit draft for review
        """
        print("\n" + "="*60)
        print(f"[STEP 8] submit_review - START (Restock ID: {pk})")
        print("="*60)

        try:
            print(f"[DEBUG] Calling BulkRestockService.submit_for_review for restock {pk}...")
            # restock = BulkRestockService.submit_for_review(pk)
            restock = BulkRestockService.submit_for_review(pk, request.user)
            print(f"[DEBUG] Restock submitted for review. New status: {restock.status}")
            
            serializer = BulkRestockDetailSerializer(restock)
            print("="*60)
            print("[STEP 8] submit_review - END")
            print("="*60 + "\n")
            
            return Response(serializer.data)

        except ValueError as e:
            print(f"[ERROR] ValueError in submit_review: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 9. PROCESS STOCK UPDATE
    # =========================================================
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """
        Process the stock update
        """
        print("\n" + "="*60)
        print(f"[STEP 9] process - START (Restock ID: {pk})")
        print("="*60)
        
        print(f"[DEBUG] Processing user: {request.user.first_name if request.user else 'Anonymous'}")

        try:
            print(f"[DEBUG] Calling BulkRestockService.process_restock for restock {pk}...")
            restock = BulkRestockService.process_restock(pk, request.user)
            print(f"[DEBUG] Restock processed successfully!")
            print(f"[DEBUG] Final status: {restock.status}")
            print(f"[DEBUG] Completed by: {restock.completed_by.first_name if restock.completed_by else 'None'}")
            print(f"[DEBUG] Completed at: {restock.completed_at}")
            
            serializer = BulkRestockDetailSerializer(restock)
            print("="*60)
            print("[STEP 9] process - END")
            print("="*60 + "\n")
            
            return Response(serializer.data)

        except ValueError as e:
            print(f"[ERROR] ValueError in process: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # =========================================================
    # 10. LIST VIEWS
    # =========================================================
    @action(detail=False, methods=['get'])
    def Allrestocks(self, request):
        """
        Get all restocks with optional status filter
        """

        restocks = self.get_queryset().order_by('-id')

        status = request.query_params.get("status")

        if status:
            restocks = restocks.filter(status=status)

        page = self.paginate_queryset(restocks)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(restocks, many=True)
        return Response(serializer.data)