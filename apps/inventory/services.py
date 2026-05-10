from django.db import transaction
from django.db.models import F
from django.core.exceptions import ValidationError
import uuid

from apps.inventory.models import StoreStock, StockTransaction

from django.db import transaction
from django.core.exceptions import ValidationError

from apps.inventory.models import StoreStock, StockTransaction,StockTransfer


class StoreStockService:
    """
    Single source of truth for ALL stock mutations.
    Includes full audit trail (before/after stock tracking).
    """
    @staticmethod
    def get_store_stock(product, store):
        try:
            store_stock = StoreStock.objects.get(product=product, store=store)
            return store_stock.quantity
        except StoreStock.DoesNotExist:
            return 0


    @staticmethod
    @transaction.atomic
    def adjust_stock(
        *,
        product,
        store,
        action: str,
        quantity: int,
        user,
        reference="",
        remarks=""
    ):
        """
        Handles all stock operations:
        - set
        - add
        - subtract
        """

        stock, _ = StoreStock.objects.select_for_update().get_or_create(
            product=product,
            store=store,
            defaults={"quantity": 0}
        )

        # -----------------------------
        # Capture BEFORE state
        # -----------------------------
        previous_quantity = stock.quantity

        # -----------------------------
        # Determine NEW state
        # -----------------------------
        if action == "set":
            new_quantity = quantity
            transaction_type = StockTransaction.IN  # or ADJUST if you add it

        elif action == "add":
            new_quantity = stock.quantity + quantity
            transaction_type = StockTransaction.IN

        elif action == "subtract":
            if stock.quantity < quantity:
                raise ValidationError(
                    f"Insufficient stock in {store.name}. "
                    f"Available: {stock.quantity}, Requested: {quantity}"
                )
            new_quantity = stock.quantity - quantity
            transaction_type = StockTransaction.OUT

        else:
            raise ValueError("Invalid action. Use: set, add, subtract")

        # -----------------------------
        # Update stock (single source of truth)
        # -----------------------------
        stock.quantity = new_quantity
        stock.save()

        # -----------------------------
        # Create FULL audit transaction
        # -----------------------------
        return StockTransaction.objects.create(
            product=product,
            store=store,
            transaction_type=transaction_type,
            quantity=quantity,
            previous_quantity=previous_quantity,   # NEW
            new_quantity=new_quantity,             # NEW
            performed_by=user,
            reference=reference,
            remarks=remarks,
        )


    @staticmethod
    @transaction.atomic
    def transfer_stock(
        *,
        product,
        from_store,
        to_store,
        quantity,
        user,
        reference="",
        remarks=""
    ):

        if from_store == to_store:
            raise ValidationError(
                "Source and destination cannot be the same store"
            )

        # -----------------------------
        # 1. SUBTRACT from source store
        # -----------------------------
        out_tx = StoreStockService.adjust_stock(
            product=product,
            store=from_store,
            action="subtract",
            quantity=quantity,
            user=user,
            reference=reference,
            remarks=f"Transfer OUT → {to_store.name} | {remarks}"
        )

        # -----------------------------
        # 2. ADD to destination store
        # -----------------------------
        in_tx = StoreStockService.adjust_stock(
            product=product,
            store=to_store,
            action="add",
            quantity=quantity,
            user=user,
            reference=reference,
            remarks=f"Transfer IN ← {from_store.name} | {remarks}"
        )

        # -----------------------------
        # 3. CREATE TRANSFER RECORD
        # -----------------------------
        transfer = StockTransfer.objects.create(
            product=product,
            from_store=from_store,
            to_store=to_store,
            quantity=quantity,
            performed_by=user,
            notes=remarks,
            status="completed"
        )

        return {
            "transfer": transfer,
            "out_transaction": out_tx,
            "in_transaction": in_tx,
        }

# class StoreStockService:

#     @staticmethod
#     @transaction.atomic
#     def transfer_stock(product, from_store, to_store, quantity, user, reference="", remarks=""):

#         from_stock = StoreStock.objects.select_for_update().get(
#             store=from_store,
#             product=product
#         )

#         if from_stock.quantity < quantity:
#             raise ValueError("Insufficient stock")

#         from_stock.quantity -= quantity
#         from_stock.save()

#         to_stock, _ = StoreStock.objects.select_for_update().get_or_create(
#             store=to_store,
#             product=product,
#             defaults={"quantity": 0}
#         )

#         to_stock.quantity += quantity
#         to_stock.save()

#         # audit logs
#         StockTransaction.objects.create(
#             product=product,
#             store=from_store,
#             transaction_type=StockTransaction.TRANSFER_OUT,
#             quantity=quantity,
#             performed_by=user,
#             reference=reference
#         )

#         StockTransaction.objects.create(
#             product=product,
#             store=to_store,
#             transaction_type=StockTransaction.TRANSFER_IN,
#             quantity=quantity,
#             performed_by=user,
#             reference=reference
#         )

#         return {"status": "ok"}

class RestockDebugService:
    def __init__(self, restock):
        self.restock = restock

    def process(self):

        print("\n========== RESTOCK PROCESS START ==========")

        print("RESTOCK ID:", self.restock.id)
        print("STORE:", self.restock.store.name)
        print("NOTES:", self.restock.notes)
        print("COMPLETED:", self.restock.completed)

        items = self.restock.items.select_related("product").all()

        print("\nTOTAL ITEMS:", items.count())

        for i, item in enumerate(items, start=1):

            print(f"\n========== ITEM {i} ==========")

            product = item.product
            store = self.restock.store

            print("PRODUCT:", product.name)
            print("SKU:", product.sku)

            print("\n--- STOCK INFO ---")
            print("TARGET STOCK:", item.new_quantity)

            print("\n--- PRICE INFO ---")
            print("NEW PRICE:", item.new_price)

            # -----------------------------
            # 1. UPDATE STOCK (SINGLE SOURCE OF TRUTH)
            # -----------------------------
            try:
                print("\n--- STOCK UPDATE ---")

                StoreStockService.adjust_stock(
                    product=product,
                    store=store,
                    action="add",
                    quantity=item.new_quantity,
                    user=self.restock.completed_by,
                    notes=f"Restock #{self.restock.id}"
                )

                print("✔ STOCK UPDATED")

            except Exception as e:
                print("❌ STOCK UPDATE ERROR:", str(e))
                raise

            # -----------------------------
            # 2. UPDATE PRODUCT PRICE
            # -----------------------------
            try:
                if item.new_price is not None:

                    print("\n--- PRICE UPDATE ---")
                    print("CURRENT:", product.selling_price)

                    product.selling_price = item.new_price
                    product.save()

                    print("NEW:", product.selling_price)
                    print("✔ PRICE UPDATED")

            except Exception as e:
                print("❌ PRICE UPDATE ERROR:", str(e))
                raise

        # -----------------------------
        # MARK RESTOCK COMPLETE
        # -----------------------------
        self.restock.completed = True
        self.restock.save()

        print("\n========== RESTOCK PROCESS COMPLETE ==========")