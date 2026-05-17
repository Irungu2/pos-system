# services.py
from django.db import models
from django.utils import timezone
from django.db import transaction
from django.db import transaction
from django.db.models import Q, F
from decimal import Decimal
from typing import List, Dict, Any
from django.utils import timezone

from .models import BulkRestock, BulkRestockItem, StoreStock, StockTransaction, Product


from .services import StoreStockService


class BulkRestockService:
    @staticmethod
    @transaction.atomic
    def create_draft(store_id: int, data: Dict[str, Any], user) -> BulkRestock:
        """Create a draft bulk restock with selected items"""

        from apps.inventory.serializers import BulkRestockCreateSerializer

        if not data.get('items'):
            raise ValueError("At least one item must be selected for restock")

        payload = {
            'store': store_id,
            **data
        }

        # 🔍 show exactly what is going into serializer
        # print("[BulkRestockService] Serializer payload:")
        # print(payload)

        serializer = BulkRestockCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        restock = serializer.save()

        return restock
    @staticmethod
    @transaction.atomic
    def update_item(item_id: int, new_quantity: int = None, new_price: Decimal = None) -> BulkRestockItem:
        """Update a single item in the bulk restock"""
        print(f"[BulkRestockService] Updating item_id={item_id}")

        item = BulkRestockItem.objects.select_related('restock').get(id=item_id)

        if item.restock.status not in ['draft', 'editing']:
            print(f"[BulkRestockService] Invalid status={item.restock.status}")
            raise ValueError(f"Cannot edit items when status is {item.restock.status}")

        if new_quantity is not None:
            if new_quantity < 0:
                print("[BulkRestockService] Negative quantity provided")
                raise ValueError("Quantity cannot be negative")

            print(f"[BulkRestockService] Updating quantity {item.new_quantity} -> {new_quantity}")
            item.new_quantity = new_quantity

        if new_price is not None:
            if new_price < 0:
                print("[BulkRestockService] Negative price provided")
                raise ValueError("Price cannot be negative")

            print(f"[BulkRestockService] Updating price {item.new_price} -> {new_price}")
            item.new_price = new_price

        item.save()

        print(f"[BulkRestockService] Item {item.id} updated successfully")

        if item.restock.status == 'draft':
            item.restock.status = 'editing'
            item.restock.save(update_fields=['status'])

            print(f"[BulkRestockService] Restock {item.restock.id} status changed to editing")

        return item

    @staticmethod
    @transaction.atomic
    def add_items_to_restock(restock_id: int, product_ids: List[int]) -> BulkRestock:
        """Add more items to an existing draft restock"""
        print(f"[BulkRestockService] Adding items to restock_id={restock_id}")

        restock = BulkRestock.objects.get(id=restock_id)

        if restock.status not in ['draft', 'editing']:
            print(f"[BulkRestockService] Invalid restock status={restock.status}")
            raise ValueError(f"Cannot add items when status is {restock.status}")

        for product_id in product_ids:
            print(f"[BulkRestockService] Processing product_id={product_id}")

            exists = BulkRestockItem.objects.filter(
                restock=restock,
                product_id=product_id
            ).exists()

            if exists:
                print(f"[BulkRestockService] Product already exists in restock")
                continue

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

            print(f"[BulkRestockService] Product {product_id} added successfully")

        return restock

    @staticmethod
    @transaction.atomic
    def remove_item_from_restock(restock_id: int, item_id: int) -> BulkRestock:
        """Remove an item from draft restock"""
        print(f"[BulkRestockService] Removing item_id={item_id} from restock_id={restock_id}")

        restock = BulkRestock.objects.get(id=restock_id)

        if restock.status not in ['draft', 'editing']:
            print(f"[BulkRestockService] Invalid restock status={restock.status}")
            raise ValueError(f"Cannot remove items when status is {restock.status}")

        deleted_count, _ = BulkRestockItem.objects.filter(
            id=item_id,
            restock=restock
        ).delete()

        print(f"[BulkRestockService] Deleted items count={deleted_count}")

        return restock

    @staticmethod
    @transaction.atomic
    def bulk_update_items(restock_id: int, items_data: List[Dict]) -> BulkRestock:
        """Bulk update multiple items"""
        print(f"[BulkRestockService] Bulk updating restock_id={restock_id}")

        restock = BulkRestock.objects.get(id=restock_id)

        if restock.status not in ['draft', 'editing']:
            print(f"[BulkRestockService] Invalid restock status={restock.status}")
            raise ValueError(f"Cannot edit items when status is {restock.status}")

        for item_data in items_data:
            item_id = item_data.get('id')
            new_quantity = item_data.get('new_quantity')
            new_price = item_data.get('new_price')

            print(f"[BulkRestockService] Updating item_id={item_id}")

            if item_id:
                BulkRestockService.update_item(
                    item_id,
                    new_quantity,
                    new_price
                )

        restock.status = 'reviewed'
        restock.save(update_fields=['status'])

        print(f"[BulkRestockService] Restock {restock.id} marked as reviewed")

        return restock

    # @staticmethod
    # @transaction.atomic
    # def submit_for_review(restock_id: int) -> BulkRestock:
    #     """Submit restock for final review"""
    #     print(f"[BulkRestockService] Submitting restock_id={restock_id} for review")

    #     restock = BulkRestock.objects.get(id=restock_id)

    #     if restock.status not in ['draft','editing', 'reviewed']:
    #         print(f"[BulkRestockService] Invalid status={restock.status}")
    #         raise ValueError(f"Cannot submit for review when status is {restock.status}")

    #     restock.status = 'reviewed'
    #     restock.save(update_fields=['status'])

    #     print(f"[BulkRestockService] Restock {restock.id} submitted for review")

    #     return restock

    @staticmethod
    @transaction.atomic
    def submit_for_review(restock_id: int, user) -> BulkRestock:
        """Submit restock for final review and immediately process it"""

        print(f"[BulkRestockService] Submitting restock_id={restock_id} for review")

        restock = BulkRestock.objects.get(id=restock_id)

        if restock.status not in ['draft', 'editing', 'reviewed']:
            print(f"[BulkRestockService] Invalid status={restock.status}")
            raise ValueError(
                f"Cannot submit for review when status is {restock.status}"
            )

        # -----------------------------
        # Move to reviewed
        # -----------------------------
        restock.status = 'reviewed'
        restock.save(update_fields=['status'])

        print(f"[BulkRestockService] Restock {restock.id} submitted for review")

        # -----------------------------
        # AUTO PROCESS AFTER REVIEW
        # -----------------------------
        return BulkRestockService.process_restock(
            restock_id=restock.id,
            user=user
        )


    # @staticmethod
    # @transaction.atomic
    # def process_restock(restock_id: int, user) -> BulkRestock:
    #     """Process the restock and update actual stock"""
    #     print(f"[BulkRestockService] Processing restock_id={restock_id}")

    #     restock = BulkRestock.objects.prefetch_related(
    #         'items__product'
    #     ).get(id=restock_id)

    #     if restock.status != 'reviewed':
    #         print(f"[BulkRestockService] Invalid status={restock.status}")
    #         raise ValueError(
    #             f"Cannot process restock when status is {restock.status}"
    #         )

    #     restock.status = 'processing'
    #     restock.save(update_fields=['status'])

    #     print(f"[BulkRestockService] Restock {restock.id} status changed to processing")

    #     try:
    #         for item in restock.items.all():
    #             print(f"[BulkRestockService] Processing item_id={item.id}")

    #             # -----------------------------
    #             # STOCK UPDATE (via service)
    #             # -----------------------------
    #             if item.new_quantity != item.current_quantity:

    #                 StoreStockService.adjust_stock(
    #                     product=item.product,
    #                     store=restock.store,
    #                     action="add",
    #                     quantity=item.new_quantity,
    #                     user=user,
    #                     reference=f"BULK_RESTOCK_{restock.id}",
    #                     remarks=restock.notes or "Bulk restock operation"
    #                 )

    #                 print(
    #                     f"[BulkRestockService] Stock adjusted for product_id={item.product.id}"
    #                 )

    #             # -----------------------------
    #             # PRICE UPDATE
    #             # -----------------------------
    #             if item.new_price and item.new_price != item.current_price:
    #                 print(
    #                     f"[BulkRestockService] Updating product price "
    #                     f"{item.current_price} -> {item.new_price}"
    #                 )

    #                 item.product.selling_price = item.new_price
    #                 item.product.save(update_fields=['selling_price'])

    #         # -----------------------------
    #         # MARK COMPLETED
    #         # -----------------------------
    #         restock.status = 'completed'
    #         restock.completed = True
    #         restock.completed_at = timezone.now()
    #         restock.completed_by = user

    #         restock.save(update_fields=[
    #             'status',
    #             'completed',
    #             'completed_at',
    #             'completed_by'
    #         ])

    #         print(f"[BulkRestockService] Restock {restock.id} completed successfully")

    #     except Exception as e:
    #         print(f"[BulkRestockService] Error processing restock: {str(e)}")

    #         # rollback status
    #         restock.status = 'reviewed'
    #         restock.save(update_fields=['status'])

    #         raise e

    #     return restock

    @staticmethod
    @transaction.atomic
    def process_restock(restock_id: int, user) -> BulkRestock:
        """Process the restock and update actual stock"""

        print(f"[BulkRestockService] Processing restock_id={restock_id}")

        restock = BulkRestock.objects.prefetch_related(
            'items__product'
        ).get(id=restock_id)

        if restock.status != 'reviewed':
            print(f"[BulkRestockService] Invalid status={restock.status}")

            raise ValueError(
                f"Cannot process restock when status is {restock.status}"
            )

        # -----------------------------
        # MOVE TO PROCESSING
        # -----------------------------
        restock.status = 'processing'
        restock.save(update_fields=['status'])

        print(
            f"[BulkRestockService] Restock {restock.id} "
            f"status changed to processing"
        )

        try:

            for item in restock.items.all():

                print(
                    f"[BulkRestockService] Processing item_id={item.id}"
                )

                # =====================================================
                # STOCK ADDITION
                # =====================================================
                # new_quantity means:
                # QUANTITY TO ADD
                # NOT final stock quantity
                # =====================================================

                if item.new_quantity and item.new_quantity > 0:

                    print(
                        f"[BulkRestockService] Adding stock: "
                        f"{item.new_quantity} units "
                        f"to product_id={item.product.id}"
                    )

                    StoreStockService.adjust_stock(
                        product=item.product,
                        store=restock.store,
                        action="add",
                        quantity=item.new_quantity,
                        user=user,
                        reference=f"BULK_RESTOCK_{restock.id}",
                        remarks=restock.notes or "Bulk restock operation"
                    )

                    print(
                        f"[BulkRestockService] "
                        f"Stock updated successfully"
                    )

                # =====================================================
                # PRICE UPDATE
                # =====================================================

                if (
                    item.new_price is not None and
                    item.new_price != item.current_price
                ):

                    print(
                        f"[BulkRestockService] Updating price "
                        f"{item.current_price} -> {item.new_price}"
                    )

                    item.product.selling_price = item.new_price

                    item.product.save(
                        update_fields=['selling_price']
                    )

                    print(
                        f"[BulkRestockService] "
                        f"Price updated successfully"
                    )

            # =====================================================
            # MARK COMPLETED
            # =====================================================

            restock.status = 'completed'
            restock.completed = True
            restock.completed_at = timezone.now()
            restock.completed_by = user

            restock.save(update_fields=[
                'status',
                'completed',
                'completed_at',
                'completed_by'
            ])

            print(
                f"[BulkRestockService] "
                f"Restock {restock.id} completed successfully"
            )

        except Exception as e:

            print(
                f"[BulkRestockService] "
                f"Error processing restock: {str(e)}"
            )

            # rollback status
            restock.status = 'reviewed'

            restock.save(update_fields=['status'])

            raise e

        return restock

    @staticmethod
    def get_products_for_restock(
        store_id: int,
        category_id: int = None,
        search: str = None,
        stock_status: str = None,
        page: int = 1,
        page_size: int = 20
    ):
        """Get products available for restock with pagination"""

        print(
            f"[BulkRestockService] Fetching products "
            f"store_id={store_id}, page={page}"
        )

        from django.core.paginator import Paginator

        products = Product.objects.filter(is_active=True)

        if category_id:
            print(f"[BulkRestockService] Applying category filter={category_id}")
            products = products.filter(category_id=category_id)

        if search:
            print(f"[BulkRestockService] Applying search={search}")

            products = products.filter(
                Q(name__icontains=search) |
                Q(sku__icontains=search) |
                Q(barcode__icontains=search)
            )

        products = products.annotate(
            current_stock=models.Subquery(
                StoreStock.objects.filter(
                    store_id=store_id,
                    product=models.OuterRef('id')
                ).values('quantity')[:1]
            )
        )

        if stock_status:
            print(f"[BulkRestockService] Applying stock_status={stock_status}")

            if stock_status == 'low_stock':
                products = products.filter(
                    Q(current_stock__lte=F('reorder_level')) |
                    Q(current_stock__isnull=True)
                )

            elif stock_status == 'out_of_stock':
                products = products.filter(
                    Q(current_stock=0) |
                    Q(current_stock__isnull=True)
                )

            elif stock_status == 'in_stock':
                products = products.filter(
                    current_stock__gt=F('reorder_level')
                )

        products = products.order_by('name')

        paginator = Paginator(products, page_size)
        page_obj = paginator.get_page(page)

        print(
            f"[BulkRestockService] Products fetched successfully "
            f"total={paginator.count}"
        )

        return {
            'products': page_obj.object_list,
            'total': paginator.count,
            'page': page,
            'page_size': page_size,
            'total_pages': paginator.num_pages
        } 