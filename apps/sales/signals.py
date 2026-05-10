
# from django.db.models.signals import post_save, pre_delete
# from django.dispatch import receiver
# from django.core.exceptions import ValidationError
# from .models import SaleItem
# from apps.inventory.services import InventoryService

# @receiver(post_save, sender=SaleItem)
# def deduct_stock_on_sale_item_create(sender, instance, created, **kwargs):
#     if created:
#         # Only perform action, NO validation
#         InventoryService.remove_stock(
#             product=instance.product,
#             store=instance.sale.store,
#             quantity=instance.quantity,
#             user=instance.sale.cashier,
#             reference=f"SALE_{instance.sale.sale_id}",
#             remarks=f"Sale: {instance.quantity} units"
#         )