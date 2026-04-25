# from django.db import transaction
# from django.core.exceptions import ValidationError
# from .models import Product, Store, StoreStock, StockTransaction, User


# class InventoryService:
#     """Service layer for all inventory operations"""
    
#     @staticmethod
#     @transaction.atomic
#     def add_stock(product, store, quantity, user, reference="", remarks=""):
#         """Add stock to a store"""
#         transaction_obj = StockTransaction.objects.create(
#             product=product,
#             store=store,
#             transaction_type=StockTransaction.IN,
#             quantity=quantity,
#             performed_by=user,
#             reference=reference,
#             remarks=remarks or f"Stock addition: {quantity} units"
#         )
#         return transaction_obj
    
#     @staticmethod
#     @transaction.atomic
#     def remove_stock(product, store, quantity, user, reference="", remarks=""):
#         """Remove stock from a store"""
#         transaction_obj = StockTransaction.objects.create(
#             product=product,
#             store=store,
#             transaction_type=StockTransaction.OUT,
#             quantity=quantity,
#             performed_by=user,
#             reference=reference,
#             remarks=remarks or f"Stock removal: {quantity} units"
#         )
#         return transaction_obj
    
#     @staticmethod
#     @transaction.atomic
#     def transfer_stock(product, from_store, to_store, quantity, user, reference=""):
#         """Transfer stock between stores"""
#         # First, remove from source store
#         out_transaction = StockTransaction.objects.create(
#             product=product,
#             store=from_store,
#             transaction_type=StockTransaction.OUT,
#             quantity=quantity,
#             performed_by=user,
#             reference=reference,
#             remarks=f"Transfer to {to_store.name}"
#         )
        
#         # Then, add to destination store
#         in_transaction = StockTransaction.objects.create(
#             product=product,
#             store=to_store,
#             transaction_type=StockTransaction.IN,
#             quantity=quantity,
#             performed_by=user,
#             reference=reference,
#             remarks=f"Transfer from {from_store.name}",
#             related_transaction=out_transaction
#         )
        
#         # Link the transactions
#         out_transaction.related_transaction = in_transaction
#         out_transaction.save()
        
#         return out_transaction, in_transaction
    
#     @staticmethod
#     def refill_shop_from_warehouse(product, quantity, user, shop=None, warehouse=None):
#         """Refill shop from warehouse (main use case)"""
#         if not shop:
#             shop = Store.objects.filter(store_type=Store.RETAIL).first()
#         if not warehouse:
#             warehouse = Store.objects.filter(
#                 store_type=Store.WAREHOUSE, 
#                 is_default_warehouse=True
#             ).first() or Store.objects.filter(store_type=Store.WAREHOUSE).first()
        
#         if not shop or not warehouse:
#             raise ValidationError("Both shop and warehouse must be configured")
        
#         return InventoryService.transfer_stock(
#             product=product,
#             from_store=warehouse,
#             to_store=shop,
#             quantity=quantity,
#             user=user,
#             reference="SHOP_REFILL"
#         )
    
#     @staticmethod
#     def get_store_stock(product, store):
#         """Get stock quantity for a product in a specific store"""
#         try:
#             store_stock = StoreStock.objects.get(product=product, store=store)
#             return store_stock.quantity
#         except StoreStock.DoesNotExist:
#             return 0
    
#     @staticmethod
#     def get_total_stock(product):
#         """Get total stock across all stores"""
#         return product.stock_quantity
    
#     @staticmethod
#     def check_low_stock(store=None, threshold=None):
#         """Check for products with low stock"""
#         queryset = StoreStock.objects.select_related('product', 'store')
        
#         if store:
#             queryset = queryset.filter(store=store)
        
#         if threshold is None:
#             # Use product's reorder level
#             queryset = queryset.filter(quantity__lte=models.F('product__reorder_level'))
#         else:
#             queryset = queryset.filter(quantity__lte=threshold)
        
#         return queryset


# class AutoReplenishmentService:
#     """Service for automatic shop replenishment"""
    
#     @staticmethod
#     def auto_refill_low_stock_products(user, target_shop_stock=50):
#         """Automatically refill shop products that are low on stock"""
#         shop = Store.objects.filter(store_type=Store.RETAIL).first()
#         warehouse = Store.objects.filter(
#             store_type=Store.WAREHOUSE, 
#             is_default_warehouse=True
#         ).first()
        
#         if not shop or not warehouse:
#             return []
        
#         low_stock_items = StoreStock.objects.filter(
#             store=shop,
#             quantity__lte=models.F('product__reorder_level')
#         ).select_related('product')
        
#         refilled_products = []
        
#         for shop_stock in low_stock_items:
#             product = shop_stock.product
#             warehouse_stock = InventoryService.get_store_stock(product, warehouse)
            
#             if warehouse_stock > 0:
#                 # Calculate how much to transfer
#                 needed = target_shop_stock - shop_stock.quantity
#                 can_transfer = min(needed, warehouse_stock)
                
#                 if can_transfer > 0:
#                     try:
#                         InventoryService.refill_shop_from_warehouse(
#                             product=product,
#                             quantity=can_transfer,
#                             user=user,
#                             shop=shop,
#                             warehouse=warehouse
#                         )
#                         refilled_products.append({
#                             'product': product,
#                             'quantity': can_transfer,
#                             'shop': shop,
#                             'warehouse': warehouse
#                         })
#                     except ValidationError as e:
#                         # Log the error but continue with other products
#                         print(f"Failed to refill {product.name}: {e}")
        
#         return refilled_products

from django.db import transaction
from django.core.exceptions import ValidationError
from .models import StoreStock

class InventoryService:
    """Simple service for inventory operations"""
    
    @staticmethod
    def get_store_stock(product, store):
        """Get stock quantity for a product in a specific store"""
        try:
            store_stock = StoreStock.objects.get(product=product, store=store)
            return store_stock.quantity
        except StoreStock.DoesNotExist:
            return 0
    
    @staticmethod
    @transaction.atomic
    def remove_stock(product, store, quantity, user, reference="", remarks=""):
        """Remove stock from a store"""
        from .models import StockTransaction
        
        # Check stock availability
        available_stock = InventoryService.get_store_stock(product, store)
        if available_stock < quantity:
            raise ValidationError(
                f"Insufficient stock in {store.name}. "
                f"Available: {available_stock}, Requested: {quantity}"
            )
        
        # Create OUT transaction (signal will handle stock update)
        transaction_obj = StockTransaction.objects.create(
            product=product,
            store=store,
            transaction_type=StockTransaction.OUT,
            quantity=quantity,
            performed_by=user,
            reference=reference,
            remarks=remarks
        )
        return transaction_obj
    
    @staticmethod
    @transaction.atomic
    def add_stock(product, store, quantity, user, reference="", remarks=""):
        """Add stock to a store"""
        from .models import StockTransaction
        
        # Create IN transaction (signal will handle stock update)
        transaction_obj = StockTransaction.objects.create(
            product=product,
            store=store,
            transaction_type=StockTransaction.IN,
            quantity=quantity,
            performed_by=user,
            reference=reference,
            remarks=remarks
        )
        return transaction_obj