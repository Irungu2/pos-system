from django.db import models
from django.utils import timezone
import uuid
from apps.account.models import User
from apps.inventory.models import Product, Store

# class Sale(models.Model):
#     sale_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
#     cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="sales")
#     total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
#     timestamp = models.DateTimeField(default=timezone.now)
#     store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="sales", null=True)

#     def __str__(self):
#         return f"Sale {self.sale_id} by {self.cashier}"

#     def save(self, *args, **kwargs):
#         if not self.store:
#             self.store = Store.objects.filter(store_type=Store.RETAIL).first()
#         super().save(*args, **kwargs)

#     def recalculate_total(self):
#         """Recalculate total from sale items"""
#         total = sum(item.subtotal for item in self.items.all())
#         self.total_amount = total
#         self.save(update_fields=['total_amount'])

# models.py - Add to your Sale model

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
    
    def get_subtotal(self):
        """Calculate subtotal without tax"""
        return sum(item.subtotal for item in self.items.all())
    
    def get_tax_amount(self):
        """Calculate total tax from all items based on product tax rates"""
        total_tax = 0
        for item in self.items.select_related('product').all():
            if item.product.is_taxable:
                tax_rate = item.product.tax_rate / 100  # Convert percentage to decimal
                item_tax = item.subtotal * tax_rate
                total_tax += item_tax
        return total_tax
    
    def get_receipt_data(self):
        """Prepare sale data for receipt printing - Tax from products"""
        items_data = []
        total_tax = 0
        
        for item in self.items.select_related('product').all():
            # Calculate item tax
            item_subtotal = float(item.subtotal)
            item_tax = 0
            
            if item.product.is_taxable:
                tax_rate = float(item.product.tax_rate)
                item_tax = item_subtotal * (tax_rate / 100)
                total_tax += item_tax
            
            items_data.append({
                'product_name': item.product.name,
                'product_id': item.product.id,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'subtotal': item_subtotal,
                'is_taxable': item.product.is_taxable,
                'tax_rate': float(item.product.tax_rate) if item.product.is_taxable else 0,
                'item_tax': item_tax,
                'sku': item.product.sku or '',
            })
        
        subtotal = float(self.get_subtotal())
        total = subtotal + total_tax
        
        return {
            'sale_id': str(self.sale_id),
            'total_amount': total,
            'subtotal_amount': subtotal,
            'tax_amount': total_tax,
            'cashier_name': self.cashier.get_full_name() or self.cashier.display_name,
            'timestamp': self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            'items': items_data,
            'items_count': self.items.count()
        }
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
