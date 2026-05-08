
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import StoreStock

# class InventoryService:
#     """Simple service for inventory operations"""
    
#     @staticmethod
#     def get_store_stock(product, store):
#         """Get stock quantity for a product in a specific store"""
#         try:
#             store_stock = StoreStock.objects.get(product=product, store=store)
#             return store_stock.quantity
#         except StoreStock.DoesNotExist:
#             return 0
    
#     @staticmethod
#     @transaction.atomic
#     def remove_stock(product, store, quantity, user, reference="", remarks=""):
#         """Remove stock from a store"""
#         from .models import StockTransaction
        
#         # Check stock availability
#         available_stock = InventoryService.get_store_stock(product, store)
#         if available_stock < quantity:
#             raise ValidationError(
#                 f"Insufficient stock in {store.name}. "
#                 f"Available: {available_stock}, Requested: {quantity}"
#             )
        
#         # Create OUT transaction (signal will handle stock update)
#         transaction_obj = StockTransaction.objects.create(
#             product=product,
#             store=store,
#             transaction_type=StockTransaction.OUT,
#             quantity=quantity,
#             performed_by=user,
#             reference=reference,
#             remarks=remarks
#         )
#         return transaction_obj
    
#     @staticmethod
#     @transaction.atomic
#     def add_stock(product, store, quantity, user, reference="", remarks=""):
#         """Add stock to a store"""
#         from .models import StockTransaction
        
#         # Create IN transaction (signal will handle stock update)
#         transaction_obj = StockTransaction.objects.create(
#             product=product,
#             store=store,
#             transaction_type=StockTransaction.IN,
#             quantity=quantity,
#             performed_by=user,
#             reference=reference,
#             remarks=remarks
#         )
#         return transaction_obj


from django.db import transaction
from django.core.exceptions import ValidationError
from .models import StoreStock

class InventoryService:
    """Inventory operations with proper locking"""

    @staticmethod
    def get_store_stock(product, store):
        try:
            store_stock = StoreStock.objects.get(product=product, store=store)
            return store_stock.quantity
        except StoreStock.DoesNotExist:
            return 0

    @staticmethod
    @transaction.atomic
    def remove_stock(product, store, quantity, user, reference="", remarks=""):
        from .models import StockTransaction

        # 🔒 LOCK the row
        try:
            store_stock = StoreStock.objects.select_for_update().get(
                product=product,
                store=store
            )
        except StoreStock.DoesNotExist:
            raise ValidationError(
                f"No stock record for {product.name} in {store.name}"
            )

        # ✅ Safe check AFTER lock
        if store_stock.quantity < quantity:
            raise ValidationError(
                f"Insufficient stock in {store.name}. "
                f"Available: {store_stock.quantity}, Requested: {quantity}"
            )

        # ✅ Deduct immediately (NO signal dependency)
        store_stock.quantity -= quantity
        store_stock.save()

        # Record transaction
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
        from .models import StockTransaction

        # 🔒 LOCK or create
        store_stock, _ = StoreStock.objects.select_for_update().get_or_create(
            product=product,
            store=store,
            defaults={"quantity": 0}
        )

        store_stock.quantity += quantity
        store_stock.save()

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