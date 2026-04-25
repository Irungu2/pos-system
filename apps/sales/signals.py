
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from .models import SaleItem
from apps.inventory.services import InventoryService

@receiver(post_save, sender=SaleItem)
def deduct_stock_on_sale_item_create(sender, instance, created, **kwargs):
    """
    Automatically deduct stock when SaleItem is created
    Works in both Admin and Views
    """
    if created:
        # Check stock availability
        available_stock = InventoryService.get_store_stock(instance.product, instance.sale.store)
        if available_stock < instance.quantity:
            raise ValidationError(
                f"Cannot create sale item: Insufficient stock for {instance.product.name}. "
                f"Available: {available_stock}, Requested: {instance.quantity}"
            )
        
        # Deduct stock
        InventoryService.remove_stock(
            product=instance.product,
            store=instance.sale.store,
            quantity=instance.quantity,
            user=instance.sale.cashier,
            reference=f"SALE_{instance.sale.sale_id}",
            remarks=f"Sale: {instance.quantity} units"
        )

@receiver(pre_delete, sender=SaleItem)
def restore_stock_on_sale_item_delete(sender, instance, **kwargs):
    """
    Restore stock when SaleItem is deleted (sale cancellation)
    """
    InventoryService.add_stock(
        product=instance.product,
        store=instance.sale.store,
        quantity=instance.quantity,
        user=instance.sale.cashier,
        reference=f"SALE_CANCEL_{instance.sale.sale_id}",
        remarks=f"Sale cancellation: {instance.quantity} units"
    )