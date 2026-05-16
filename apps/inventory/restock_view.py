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
        print("\n" + "="*60)
        print("[PAGE VIEW] BulkRestockPageView - START")
        print("="*60)
        
        context = super().get_context_data(**kwargs)
        
        print(f"[DEBUG] User: {self.request.user.first_name if self.request.user else 'Anonymous'}")
        
        # Get current store (based on your helper logic)
        current_store = get_current_store(self.request)
        print(f"[DEBUG] Current store: {current_store.name if current_store else 'None'}")

        # context['stores'] = Store.objects.filter(is_active=True)
        context['current_store'] = current_store
        
        # Get restock counts for dashboard display
        total_restocks = BulkRestock.objects.filter(store=current_store).count() if current_store else 0
        pending_restocks = BulkRestock.objects.filter(store=current_store, completed=False).count() if current_store else 0
        completed_restocks = BulkRestock.objects.filter(store=current_store, completed=True).count() if current_store else 0
        
        context['total_restocks'] = total_restocks
        context['pending_restocks'] = pending_restocks
        context['completed_restocks'] = completed_restocks
        print (' the  bulk restock context is ',total_restocks,pending_restocks,completed_restocks)

        print(f"[DEBUG] Restock counts for store - Total: {total_restocks}, Pending: {pending_restocks}, Completed: {completed_restocks}")
        print(f"[DEBUG] Template: {self.template_name}")
        print("="*60)
        print("[PAGE VIEW] BulkRestockPageView - END")
        print("="*60 + "\n")

        return context


class BulkRestockCreatePageView(LoginRequiredMixin, TemplateView):
    """Step 1 & 2: Select items and create draft"""
    template_name = "restock/bulk_restock_create.html"
    
    def get_context_data(self, **kwargs):
        print("\n" + "="*60)
        print("[PAGE VIEW] BulkRestockCreatePageView - START")
        print("="*60)
        
        context = super().get_context_data(**kwargs)
        
        print(f"[DEBUG] User: {self.request.user.first_name if self.request.user else 'Anonymous'}")
        
        # Get all active stores
        stores = Store.objects.filter(is_active=True) if hasattr(Store, 'is_active') else Store.objects.all()
        context['stores'] = stores
        
        print(f"[DEBUG] Available stores: {stores.count()}")
        for store in stores[:3]:  # Print first 3 stores
            print(f"  - Store ID: {store.id}, Name: {store.name}")
        
        # Get current store from session or default to first store
        current_store = get_current_store(self.request)
        context['current_store'] = current_store
        print(f"[DEBUG] Current store from session: {current_store.name if current_store else 'None'}")
        
        # Get product categories for filtering
        categories = Category.objects.filter(is_active=True) if hasattr(Category, 'is_active') else Category.objects.all()
        context['categories'] = categories
        print(f"[DEBUG] Available categories: {categories.count()}")
        
        # Get any existing draft in progress (optional)
        existing_draft = BulkRestock.objects.filter(
            store=current_store,
            status='draft',
            completed=False
        ).first() if current_store else None
        
        if existing_draft:
            print(f"[DEBUG] Found existing draft: ID {existing_draft.id}")
            context['existing_draft_id'] = existing_draft.id
        else:
            print(f"[DEBUG] No existing draft found")
            context['existing_draft_id'] = None
        
        # API endpoints for JavaScript
        context['api_endpoints'] = {
            'available_products': '/api/bulk-restock/available_products/',
            'create_draft': '/api/bulk-restock/create_draft/',
        }
        
        print(f"[DEBUG] Template: {self.template_name}")
        print(f"[DEBUG] Context keys: {list(context.keys())}")
        print("="*60)
        print("[PAGE VIEW] BulkRestockCreatePageView - END")
        print("="*60 + "\n")
        
        return context
    
    def get(self, request, *args, **kwargs):
        print(f"\n[HTTP GET] BulkRestockCreatePageView - Loading page with GET params: {dict(request.GET)}")
        return super().get(request, *args, **kwargs)
    
    def post(self, request, *args, **kwargs):
        print(f"\n[HTTP POST] BulkRestockCreatePageView - Form submission received")
        print(f"[DEBUG] POST data: {request.POST}")
        print(f"[DEBUG] FILES: {request.FILES}")
        return super().post(request, *args, **kwargs)


class BulkRestockEditPageView(LoginRequiredMixin, TemplateView):
    """Step 3: Edit quantities and prices"""
    template_name = "restock/bulk_restock_edit.html"
    
    def get_context_data(self, **kwargs):
        
        context = super().get_context_data(**kwargs)
        restock_id = self.kwargs['pk']
        context['restock_id'] = restock_id

        # Fetch restock details for validation
        try:
            restock = BulkRestock.objects.select_related('store', 'completed_by').get(id=restock_id)            
            # Check if restock can be edited
            if restock.completed:
                # print(f"[WARNING] Restock {restock_id} is already completed and cannot be edited")
                context['is_editable'] = False
                context['error_message'] = "This restock has already been processed and cannot be edited."
            elif restock.status not in ['draft', 'pending_review']:
                # print(f"[WARNING] Restock {restock_id} is in status '{restock.status}' and cannot be edited")
                context['is_editable'] = False
                context['error_message'] = f"This restock is in '{restock.status}' status and cannot be edited."
            else:
                # print(f"[DEBUG] Restock is editable")
                context['is_editable'] = True
            
            context['store_name'] = restock.store.name
            context['restock_status'] = restock.status
            
            # Get item count for display
            item_count = restock.items.count()
            context['item_count'] = item_count
            print(f"[DEBUG] Item count: {item_count}")
            
            # Calculate total value for display
            total_value = sum(
                item.new_quantity * (item.new_price or item.current_price)
                for item in restock.items.all()
            )
            context['total_value'] = total_value
            print(f"[DEBUG] Total restock value: {total_value}")
            
        except BulkRestock.DoesNotExist:
            print(f"[ERROR] Restock {restock_id} not found!")
            context['is_editable'] = False
            context['error_message'] = f"Restock with ID {restock_id} not found."
        except Exception as e:
            print(f"[ERROR] Exception fetching restock: {str(e)}")
            import traceback
            traceback.print_exc()
            context['is_editable'] = False
            context['error_message'] = f"Error loading restock: {str(e)}"
        
        # API endpoints for JavaScript
        context['api_endpoints'] = {
            'get_restock': f'/api/bulk-restock/{restock_id}/',
            'add_items': f'/api/bulk-restock/{restock_id}/add_items/',
            'remove_item': f'/api/bulk-restock/{restock_id}/remove_item/',
            'update_item': f'/api/bulk-restock/{restock_id}/update_item/',
            'bulk_update': f'/api/bulk-restock/{restock_id}/bulk_update_items/',
            'summary': f'/api/bulk-restock/{restock_id}/summary/',
        }
        
        print(f"[DEBUG] Template: {self.template_name}")
        print(f"[DEBUG] Context prepared with {len(context)} keys")
        print("="*60)
        print("[PAGE VIEW] BulkRestockEditPageView - END")
        print("="*60 + "\n")
        
        return context
    
    def get(self, request, *args, **kwargs):
        print(f"\n[HTTP GET] BulkRestockEditPageView - Loading edit page for restock {self.kwargs['pk']}")
        return super().get(request, *args, **kwargs)

class BulkRestockReviewPageView(LoginRequiredMixin, TemplateView):
    """Step 4: Summary review"""
    
    template_name = "restock/bulk_restock_review.html"

    def get_context_data(self, **kwargs):
        print("\n" + "=" * 60)
        print("[PAGE VIEW] BulkRestockReviewPageView - START")
        print("=" * 60)

        context = super().get_context_data(**kwargs)

        restock_id = self.kwargs['pk']
        context['restock_id'] = restock_id

        print(f"[DEBUG] User: {self.request.user.first_name if self.request.user else 'Anonymous'}")
        print(f"[DEBUG] Restock ID: {restock_id}")

        try:
            # Fetch restock details
            restock = (
                BulkRestock.objects
                .select_related('store', 'completed_by')
                .prefetch_related('items__product')
                .get(id=restock_id)
            )

            print(
                f"[DEBUG] Restock found - "
                f"Status: {restock.status}, "
                f"Store: {restock.store.name}"
            )

            # Status checks
            if restock.completed:
                print(f"[WARNING] Restock {restock_id} is already completed")

                context['can_submit'] = False
                context['warning_message'] = (
                    "This restock has already been processed."
                )

            elif restock.status == 'draft':
                print("[INFO] Restock is in draft status")

                context['can_submit'] = True
                context['needs_submit'] = True
                context['info_message'] = (
                    "Please review and submit for final processing."
                )

            elif restock.status == 'pending_review':
                print("[INFO] Restock pending review")

                context['can_submit'] = True
                context['needs_submit'] = False
                context['info_message'] = (
                    "Ready to process stock update."
                )

            elif restock.status == 'approved':
                print("[INFO] Restock approved")

                context['can_submit'] = True
                context['needs_submit'] = False
                context['info_message'] = (
                    "Ready to process stock update."
                )

            else:
                print(
                    f"[WARNING] Invalid review status: {restock.status}"
                )

                context['can_submit'] = False
                context['warning_message'] = (
                    f"Cannot review restock in "
                    f"'{restock.status}' status."
                )

            # ---------------------------------------------------
            # FIXED CALCULATIONS
            # ---------------------------------------------------

            items = restock.items.select_related('product')

            # Quantity being added
            total_quantity_increase = sum(
                item.new_quantity or 0
                for item in items
            )

            # Current inventory value
            total_current_value = sum(
                (item.current_quantity or 0)
                * (item.current_price or 0)
                for item in items
            )

            # Final inventory value after adding stock
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

            # Difference in value
            total_value_increase = (
                total_new_value - total_current_value
            )

            # Final quantities after restock
            total_final_quantity = sum(
                (item.current_quantity or 0)
                + (item.new_quantity or 0)
                for item in items
            )

            # Save into context
            context['total_items'] = items.count()
            context['total_quantity_increase'] = total_quantity_increase
            context['total_current_value'] = total_current_value
            context['total_new_value'] = total_new_value
            context['total_value_increase'] = total_value_increase
            context['total_final_quantity'] = total_final_quantity

            # Extra info
            context['store_name'] = restock.store.name
            context['restock_status'] = restock.status
            context['created_at'] = restock.generated_at
            context['updated_at'] = restock.generated_at

            # Debug
            print("\n[DEBUG] Review Summary")
            print(f"  - Total items: {items.count()}")
            print(f"  - Quantity added: {total_quantity_increase}")
            print(f"  - Final quantity: {total_final_quantity}")
            print(f"  - Current value: {total_current_value}")
            print(f"  - Final value: {total_new_value}")
            print(f"  - Value increase: {total_value_increase}")

        except BulkRestock.DoesNotExist:
            print(f"[ERROR] Restock {restock_id} not found!")

            context['can_submit'] = False
            context['error_message'] = (
                f"Restock with ID {restock_id} not found."
            )

        except Exception as e:
            print(f"[ERROR] Exception fetching restock: {str(e)}")

            import traceback
            traceback.print_exc()

            context['can_submit'] = False
            context['error_message'] = (
                f"Error loading restock: {str(e)}"
            )

        # API endpoints
        context['api_endpoints'] = {
            'get_restock': f'/api/bulk-restock/{restock_id}/',
            'summary': f'/api/bulk-restock/{restock_id}/summary/',
            'submit_review': f'/api/bulk-restock/{restock_id}/submit_review/',
            'process': f'/api/bulk-restock/{restock_id}/process/',
        }

        print(f"\n[DEBUG] Template: {self.template_name}")
        print(f"[DEBUG] Can submit: {context.get('can_submit', False)}")

        print("=" * 60)
        print("[PAGE VIEW] BulkRestockReviewPageView - END")
        print("=" * 60 + "\n")

        return context

    def get(self, request, *args, **kwargs):
        print(
            f"\n[HTTP GET] BulkRestockReviewPageView - "
            f"Loading review page for restock {self.kwargs['pk']}"
        )

        return super().get(request, *args, **kwargs)

class BulkRestockSuccessPageView(LoginRequiredMixin, TemplateView):
    """Step 5: Success page after processing"""
    template_name = "restock/bulk_restock_success.html"
    
    def get_context_data(self, **kwargs):
        print("\n" + "="*60)
        print("[PAGE VIEW] BulkRestockSuccessPageView - START")
        print("="*60)
        
        context = super().get_context_data(**kwargs)
        restock_id = self.kwargs['pk']
        context['restock_id'] = restock_id
        
        print(f"[DEBUG] User: {self.request.user.first_name if self.request.user else 'Anonymous'}")
        print(f"[DEBUG] Restock ID: {restock_id}")
        
        # Fetch completed restock details for success page
        try:
            restock = BulkRestock.objects.select_related('store', 'completed_by').prefetch_related('items__product').get(id=restock_id)
            print(f"[DEBUG] Restock found - Status: {restock.status}, Store: {restock.store.name}")
            
            # Verify restock is completed
            if restock.completed:
                print(f"[SUCCESS] Restock {restock_id} has been successfully completed!")
                context['is_completed'] = True
                context['success_message'] = "Stock update completed successfully!"
                
                # Calculate final statistics
                items = restock.items.select_related('product')
                total_quantity_added = sum(item.quantity_change for item in items)
                total_value_added = sum(
                    item.quantity_change * (item.new_price or item.current_price)
                    for item in items
                )
                
                context['total_items_updated'] = items.count()
                context['total_quantity_added'] = total_quantity_added
                context['total_value_added'] = total_value_added
                
                print(f"[DEBUG] Final statistics:")
                print(f"  - Items updated: {items.count()}")
                print(f"  - Total quantity added: {total_quantity_added}")
                print(f"  - Total value added: {total_value_added}")
                
                context['store_name'] = restock.store.name
                context['completed_by'] = restock.completed_by.first_name if restock.completed_by else 'System'
                context['completed_at'] = restock.completed_at
                context['generated_at'] = restock.generated_at
                
            else:
                print(f"[WARNING] Restock {restock_id} is not completed yet!")
                context['is_completed'] = False
                context['warning_message'] = "This restock has not been processed yet."
                context['store_name'] = restock.store.name if restock.store else 'Unknown'
                
        except BulkRestock.DoesNotExist:
            print(f"[ERROR] Restock {restock_id} not found!")
            context['is_completed'] = False
            context['error_message'] = f"Restock with ID {restock_id} not found."
            context['store_name'] = 'Unknown'
        except Exception as e:
            print(f"[ERROR] Exception fetching restock: {str(e)}")
            import traceback
            traceback.print_exc()
            context['is_completed'] = False
            context['error_message'] = f"Error loading restock: {str(e)}"
            context['store_name'] = 'Unknown'
        
        # Get suggested actions
        context['suggested_actions'] = [
            {'name': 'Create Another Restock', 'url': '/restock/create/'},
            {'name': 'View All Restocks', 'url': '/restock/'},
            {'name': 'View Inventory', 'url': '/inventory/'},
        ]
        
        print(f"[DEBUG] Template: {self.template_name}")
        print(f"[DEBUG] Is completed: {context.get('is_completed', False)}")
        print("="*60)
        print("[PAGE VIEW] BulkRestockSuccessPageView - END")
        print("="*60 + "\n")
        
        return context
    
    def get(self, request, *args, **kwargs):
        print(f"\n[HTTP GET] BulkRestockSuccessPageView - Loading success page for restock {self.kwargs['pk']}")
        return super().get(request, *args, **kwargs)


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



    # =========================================================
    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """
        Get summary of the restock draft
        """
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
            summary['items_by_category'][cat]['value_increase'] += (
                (item.new_quantity or 0) * (item.new_price or item.current_price or 0)
            )

        response_data = {
            'restock': BulkRestockDetailSerializer(restock).data,
            'summary': summary
        }
        
        # ================== DEBUG PRINT ==================
        print("\n" + "="*60)
        print(f"[SUMMARY DEBUG] Restock ID: {pk}")
        print("- Restock Data -")
        print(response_data['restock'])
        print("- Summary Data -")
        print(response_data['summary'])
        print("="*60 + "\n")
        
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
    def my_restocks(self, request):
        """
        Get restocks created by current user
        """
        print("\n" + "="*60)
        print("[LIST] my_restocks - START")
        print("="*60)
        
        print(f"[DEBUG] Filtering restocks for user: {request.user.first_name}")
        restocks = self.get_queryset().filter(completed_by=request.user)
        print(f"[DEBUG] Found {restocks.count()} restocks for user")
        
        serializer = self.get_serializer(restocks, many=True)
        print("="*60)
        print("[LIST] my_restocks - END")
        print("="*60 + "\n")
        
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pending_restocks(self, request):
        """
        Get pending restocks (not completed)
        """
        print("\n" + "="*60)
        print("[LIST] pending_restocks - START")
        print("="*60)
        
        restocks = self.get_queryset().filter(completed=False)
        print(f"[DEBUG] Found {restocks.count()} pending restocks")
        
        for restock in restocks[:5]:  # Show first 5 pending restocks
            print(f"  - Restock {restock.id}: Status {restock.status}, Store {restock.store.name}")
        
        serializer = self.get_serializer(restocks, many=True)
        print("="*60)
        print("[LIST] pending_restocks - END")
        print("="*60 + "\n")
        
        return Response(serializer.data)