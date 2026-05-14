# services.py
from django.db import models

from django.db import transaction
from django.db.models import Q, F
from decimal import Decimal
from typing import List, Dict, Any
from django.utils import timezone
from .models import BulkRestock, BulkRestockItem, StoreStock, StockTransaction, Product

class BulkRestockService:
    
    @staticmethod
    @transaction.atomic
    def create_draft(store_id: int, data: Dict[str, Any], user) -> BulkRestock:
        """Create a draft bulk restock with selected items"""
        from apps.inventory.serializers import BulkRestockCreateSerializer
        
        # Ensure items are provided
        if not data.get('items'):
            raise ValueError("At least one item must be selected for restock")
        
        serializer = BulkRestockCreateSerializer(data={
            'store': store_id,
            **data
        })
        serializer.is_valid(raise_exception=True)
        return serializer.save()
    
    @staticmethod
    @transaction.atomic
    def update_item(item_id: int, new_quantity: int = None, new_price: Decimal = None) -> BulkRestockItem:
        """Update a single item in the bulk restock"""
        item = BulkRestockItem.objects.select_related('restock').get(id=item_id)
        
        # Validate that restock is in editing or draft status
        if item.restock.status not in ['draft', 'editing']:
            raise ValueError(f"Cannot edit items when status is {item.restock.status}")
        
        if new_quantity is not None:
            if new_quantity < 0:
                raise ValueError("Quantity cannot be negative")
            item.new_quantity = new_quantity
        
        if new_price is not None:
            if new_price < 0:
                raise ValueError("Price cannot be negative")
            item.new_price = new_price
        
        item.save()
        
        # Update restock status to editing if it's still draft
        if item.restock.status == 'draft':
            item.restock.status = 'editing'
            item.restock.save(update_fields=['status'])
        
        return item
    
    @staticmethod
    @transaction.atomic
    def add_items_to_restock(restock_id: int, product_ids: List[int]) -> BulkRestock:
        """Add more items to an existing draft restock"""
        restock = BulkRestock.objects.get(id=restock_id)
        
        if restock.status not in ['draft', 'editing']:
            raise ValueError(f"Cannot add items when status is {restock.status}")
        
        for product_id in product_ids:
            # Check if item already exists
            if not BulkRestockItem.objects.filter(restock=restock, product_id=product_id).exists():
                product = Product.objects.get(id=product_id)
                store_stock = StoreStock.objects.filter(
                    store=restock.store,
                    product=product
                ).first()
                
                current_quantity = store_stock.quantity if store_stock else 0
                current_price = product.selling_price
                
                BulkRestockItem.objects.create(
                    restock=restock,
                    product=product,
                    current_quantity=current_quantity,
                    new_quantity=current_quantity,
                    current_price=current_price,
                    new_price=current_price
                )
        
        return restock
    
    @staticmethod
    @transaction.atomic
    def remove_item_from_restock(restock_id: int, item_id: int) -> BulkRestock:
        """Remove an item from draft restock"""
        restock = BulkRestock.objects.get(id=restock_id)
        
        if restock.status not in ['draft', 'editing']:
            raise ValueError(f"Cannot remove items when status is {restock.status}")
        
        BulkRestockItem.objects.filter(id=item_id, restock=restock).delete()
        return restock
    
    @staticmethod
    @transaction.atomic
    def bulk_update_items(restock_id: int, items_data: List[Dict]) -> BulkRestock:
        """Bulk update multiple items"""
        restock = BulkRestock.objects.get(id=restock_id)
        
        if restock.status not in ['draft', 'editing']:
            raise ValueError(f"Cannot edit items when status is {restock.status}")
        
        for item_data in items_data:
            item_id = item_data.get('id')
            new_quantity = item_data.get('new_quantity')
            new_price = item_data.get('new_price')
            
            if item_id:
                BulkRestockService.update_item(item_id, new_quantity, new_price)
        
        # Update status to reviewed after bulk update
        restock.status = 'reviewed'
        restock.save(update_fields=['status'])
        
        return restock
    
    @staticmethod
    @transaction.atomic
    def submit_for_review(restock_id: int) -> BulkRestock:
        """Submit restock for final review"""
        restock = BulkRestock.objects.get(id=restock_id)
        
        if restock.status not in ['editing', 'reviewed']:
            raise ValueError(f"Cannot submit for review when status is {restock.status}")
        
        restock.status = 'reviewed'
        restock.save(update_fields=['status'])
        
        return restock
    
    @staticmethod
    @transaction.atomic
    def process_restock(restock_id: int, user) -> BulkRestock:
        """Process the restock and update actual stock"""
        restock = BulkRestock.objects.prefetch_related('items__product').get(id=restock_id)
        
        if restock.status != 'reviewed':
            raise ValueError(f"Cannot process restock when status is {restock.status}")
        
        # Update status to processing
        restock.status = 'processing'
        restock.save(update_fields=['status'])
        
        try:
            # Process each item
            for item in restock.items.all():
                if item.new_quantity != item.current_quantity:
                    # Update store stock
                    store_stock, created = StoreStock.objects.get_or_create(
                        store=restock.store,
                        product=item.product,
                        defaults={'quantity': item.new_quantity}
                    )
                    
                    if not created:
                        store_stock.quantity = item.new_quantity
                        store_stock.save()
                    
                    # Create stock transaction
                    quantity_change = abs(item.new_quantity - item.current_quantity)
                    transaction_type = StockTransaction.IN if item.new_quantity > item.current_quantity else StockTransaction.OUT
                    
                    StockTransaction.objects.create(
                        product=item.product,
                        store=restock.store,
                        transaction_type=transaction_type,
                        quantity=quantity_change,
                        performed_by=user,
                        remarks=f"Bulk Restock #{restock.id} - {restock.notes or 'Bulk restock operation'}"
                    )
                
                # Update product selling price if changed
                if item.new_price and item.new_price != item.current_price:
                    item.product.selling_price = item.new_price
                    item.product.save(update_fields=['selling_price'])
            
            # Mark restock as completed
            restock.status = 'completed'
            restock.completed = True
            restock.completed_at = timezone.now()
            restock.completed_by = user
            restock.save(update_fields=['status', 'completed', 'completed_at', 'completed_by'])
            
        except Exception as e:
            # On error, revert status
            restock.status = 'reviewed'
            restock.save(update_fields=['status'])
            raise e
        
        return restock
    
    @staticmethod
    def get_products_for_restock(store_id: int, category_id: int = None, search: str = None, 
                                  stock_status: str = None, page: int = 1, page_size: int = 20):
        """Get products available for restock with pagination"""
        from django.core.paginator import Paginator
        
        products = Product.objects.filter(is_active=True)
        
        # Apply category filter if provided (as a helper, not requirement)
        if category_id:
            products = products.filter(category_id=category_id)
        
        # Apply search filter
        if search:
            products = products.filter(
                Q(name__icontains=search) | 
                Q(sku__icontains=search) |
                Q(barcode__icontains=search)
            )
        
        # Annotate with store stock info
        products = products.annotate(
            current_stock=models.Subquery(
                StoreStock.objects.filter(
                    store_id=store_id,
                    product=models.OuterRef('id')
                ).values('quantity')[:1]
            )
        )
        
        # Filter by stock status
        if stock_status:
            if stock_status == 'low_stock':
                products = products.filter(
                    Q(current_stock__lte=F('reorder_level')) | Q(current_stock__isnull=True)
                )
            elif stock_status == 'out_of_stock':
                products = products.filter(Q(current_stock=0) | Q(current_stock__isnull=True))
            elif stock_status == 'in_stock':
                products = products.filter(current_stock__gt=F('reorder_level'))
        
        # Order by name
        products = products.order_by('name')
        
        # Paginate
        paginator = Paginator(products, page_size)
        page_obj = paginator.get_page(page)
        
        return {
            'products': page_obj.object_list,
            'total': paginator.count,
            'page': page,
            'page_size': page_size,
            'total_pages': paginator.num_pages
        }