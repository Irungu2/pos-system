from django.db import models
from django.utils import timezone
import uuid
from apps.account.models import User
from apps.inventory.models import Product, Store

class Sale(models.Model):
    sale_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="sales")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    timestamp = models.DateTimeField(default=timezone.now)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="sales", null=True)

    def __str__(self):
        return f"Sale {self.sale_id} by {self.cashier}"

    def save(self, *args, **kwargs):
        if not self.store:
            self.store = Store.objects.filter(store_type=Store.RETAIL).first()
        super().save(*args, **kwargs)

    def recalculate_total(self):
        """Recalculate total from sale items"""
        total = sum(item.subtotal for item in self.items.all())
        self.total_amount = total
        self.save(update_fields=['total_amount'])
class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ('sale', 'product')

    def save(self, *args, **kwargs):
        """
        Calculate subtotal and tax. Supports variable price and taxable products.
        """
        # Use product price if unit_price not provided
        if not self.unit_price:
            self.unit_price = self.product.selling_price

        # Calculate tax based on product settings
        if self.product.is_taxable:
            self.tax_amount = (self.unit_price * self.product.tax_rate / 100) * self.quantity
        else:
            self.tax_amount = 0

        # Subtotal includes price * quantity + tax
        self.subtotal = (self.unit_price * self.quantity) + self.tax_amount

        super().save(*args, **kwargs)

        # Recalculate sale total
        self.sale.recalculate_total()

    def delete(self, *args, **kwargs):
        sale = self.sale
        super().delete(*args, **kwargs)
        sale.recalculate_total()

    def __str__(self):
        return f"{self.quantity} × {self.product.name} = ${self.subtotal}"
