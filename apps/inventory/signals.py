from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from .models import StockTransaction, StoreStock

@receiver(post_save, sender=StockTransaction)
def update_store_stock_on_transaction(sender, instance, created, **kwargs):
    """
    Automatically update StoreStock when StockTransaction is created
    Works in both Admin and Views
    """
    print("hello=============================== am in the signal ")
    if created:
        store_stock, created = StoreStock.objects.get_or_create(
            store=instance.store,
            product=instance.product,
            defaults={"quantity": 0}
        )

        if instance.transaction_type == StockTransaction.IN:
            store_stock.quantity += instance.quantity
        elif instance.transaction_type == StockTransaction.OUT:
            if store_stock.quantity < instance.quantity:
                raise ValidationError(
                    f"Insufficient stock in {instance.store.name}. "
                    f"Available: {store_stock.quantity}, Requested: {instance.quantity}"
                )
            store_stock.quantity -= instance.quantity

        store_stock.save()