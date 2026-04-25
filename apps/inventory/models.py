from django.db import models
from django.utils import timezone
from django.db.models import Sum
import random
import string
from apps.account.models import User
from django.db.models import F

# class Category(models.Model):
#     name = models.CharField(max_length=100, unique=True)
#     description = models.TextField(blank=True)
#     created_at = models.DateTimeField(default=timezone.now)

#     def __str__(self):
#         return self.name


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, max_length=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_categories')
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Categories'
    
    def __str__(self):
        return self.name
    
    @property
    def product_count(self):
        return self.products.count()



class ProductManager(models.Manager):
    def get_by_barcode(self, barcode):
        """Get product by barcode with error handling"""
        try:
            return self.get(barcode=barcode, is_active=True)
        except Product.DoesNotExist:
            return None
    
    def bulk_get_by_barcodes(self, barcodes):
        """Efficiently get multiple products by barcodes"""
        products = self.filter(barcode__in=barcodes, is_active=True)
        return {p.barcode: p for p in products}


class Product(models.Model):
    sku = models.CharField(max_length=20, unique=True, editable=False)
    barcode = models.CharField(max_length=50, unique=True, blank=True, null=True)
    name = models.CharField(max_length=150)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name="products")
    description = models.TextField(blank=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    reorder_level = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True)
    
    # New fields
    fixed_price = models.BooleanField(default=False)  # hotel/fixed items
    is_taxable = models.BooleanField(default=True)    # is this product taxable?
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=16.0)  # e.g., 16% VAT

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ProductManager()

    def save(self, *args, **kwargs):
        if not self.sku:
            while True:
                code = f"SKU-{random.randint(10000, 99999)}"
                if not Product.objects.filter(sku=code).exists():
                    self.sku = code
                    break
        if not self.barcode:
            while True:
                barcode = ''.join(random.choices(string.digits, k=13))
                if not Product.objects.filter(barcode=barcode).exists():
                    self.barcode = barcode
                    break
        super().save(*args, **kwargs)

    @property
    def stock_quantity(self):
        result = StoreStock.objects.filter(product=self).aggregate(total=Sum('quantity'))
        return result['total'] or 0

    @property
    def available_stock(self):
        retail_stores = Store.objects.filter(store_type=Store.RETAIL)
        result = StoreStock.objects.filter(product=self, store__in=retail_stores).aggregate(total=Sum('quantity'))
        return result['total'] or 0

    @property
    def warehouse_stock(self):
        warehouse = Store.objects.filter(store_type=Store.WAREHOUSE).first()
        if warehouse:
            try:
                return StoreStock.objects.get(product=self, store=warehouse).quantity
            except StoreStock.DoesNotExist:
                return 0
        return 0

    def get_store_stock(self, store):
        try:
            return StoreStock.objects.get(product=self, store=store).quantity
        except StoreStock.DoesNotExist:
            return 0

    def is_low_stock(self, store=None):
        stock = self.get_store_stock(store) if store else self.available_stock
        return stock <= self.reorder_level

    # -----------------------------
    # New helper methods
    # -----------------------------
    def get_tax_amount(self, price=None):
        """
        Calculate tax amount based on selling price or overridden price.
        """
        price = price if price is not None else self.selling_price
        if self.is_taxable:
            return (price * self.tax_rate) / 100
        return 0

    def get_total_price(self, price=None):
        """
        Returns total price including tax (if applicable)
        """
        price = price if price is not None else self.selling_price
        return price + self.get_tax_amount(price)

    def __str__(self):
        return f"{self.name} ({self.sku})"



class Store(models.Model):
    WAREHOUSE = 'WAREHOUSE'
    RETAIL = 'RETAIL'
    STORE_TYPES = [
        (WAREHOUSE, 'Warehouse'),
        (RETAIL, 'Retail Store'),
    ]
    
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=150, blank=True, null=True)
    store_type = models.CharField(max_length=20, choices=STORE_TYPES, default=RETAIL)
    is_default_warehouse = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if self.is_default_warehouse:
            # Ensure only one default warehouse
            Store.objects.filter(is_default_warehouse=True).update(is_default_warehouse=False)
        super().save(*args, **kwargs)

    @property
    def is_warehouse(self):
        return self.store_type == self.WAREHOUSE

    @property
    def is_retail(self):
        return self.store_type == self.RETAIL

    def get_total_products(self):
        """Get count of products in this store"""
        return self.stocks.count()

    def get_low_stock_products(self):
        """Get products that are low on stock in this store"""
        return Product.objects.filter(
            storestock__store=self,
            storestock__quantity__lte=F('reorder_level')
        ).distinct()

    def __str__(self):
        return f"{self.name} ({self.get_store_type_display()})"


class StoreStock(models.Model):
    store = models.ForeignKey("inventory.Store", on_delete=models.CASCADE, related_name="stocks")
    product = models.ForeignKey("inventory.Product", on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("store", "product")
        verbose_name = "Store Stock"
        verbose_name_plural = "Store Stocks"

    def __str__(self):
        return f"{self.product.name} - {self.store.name} ({self.quantity})"


class StockTransaction(models.Model):
    IN = "IN"
    OUT = "OUT"
    TRANSFER_OUT = "TRANSFER_OUT"
    TRANSFER_IN = "TRANSFER_IN"

    TRANSACTION_TYPES = [
        (IN, "Stock In"),
        (OUT, "Stock Out"),
        (TRANSFER_OUT, "Transfer Out"),
        (TRANSFER_IN, "Transfer In"),
    ]
    product = models.ForeignKey("Product", on_delete=models.CASCADE, related_name="transactions")
    store = models.ForeignKey("Store", on_delete=models.CASCADE, related_name="outgoing_transactions")
    transaction_type = models.CharField(max_length=13, choices=TRANSACTION_TYPES)
    quantity = models.PositiveIntegerField()
    transfer_to_store = models.ForeignKey(
        "Store", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="incoming_transactions"
    )
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    reference = models.CharField(max_length=100, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.product.name} ({self.quantity})"

    class Meta:
        ordering = ['-timestamp']


#         super().save(*args, **kwargs)
from django.db import models, transaction
# from django.db.models import F
# from django.utils import timezone

class StockTransfer(models.Model):
    product = models.ForeignKey("inventory.Product", on_delete=models.CASCADE)
    from_store = models.ForeignKey(
        "inventory.Store",
        related_name="outgoing_transfers",
        on_delete=models.CASCADE
    )
    to_store = models.ForeignKey(
        "inventory.Store",
        related_name="incoming_transfers",
        on_delete=models.CASCADE
    )
    quantity = models.PositiveIntegerField()
    performed_by = models.ForeignKey(
        "account.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_transfers"
    )
    status = models.CharField(
        max_length=20,
        default='completed',
        editable=False
    )
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product.name}: {self.quantity} units {self.from_store} → {self.to_store}"

    @transaction.atomic
    def save(self, *args, **kwargs):
        is_new = not self.pk
        
        if is_new:
            # VALIDATE STOCK AVAILABILITY
            from_stock = StoreStock.objects.select_for_update().filter(
                store=self.from_store, 
                product=self.product
            ).first()
            
            if not from_stock or from_stock.quantity < self.quantity:
                raise ValueError(
                    f"Insufficient stock in {self.from_store.name}. "
                    f"Available: {from_stock.quantity if from_stock else 0}"
                )
            
            # UPDATE SOURCE STOCK
            from_stock.quantity = F('quantity') - self.quantity
            from_stock.save(update_fields=['quantity'])
            
            # UPDATE OR CREATE DESTINATION STOCK
            to_stock, created = StoreStock.objects.select_for_update().get_or_create(
                store=self.to_store,
                product=self.product,
                defaults={'quantity': self.quantity}
            )
            
            if not created:
                to_stock.quantity = F('quantity') + self.quantity
                to_stock.save(update_fields=['quantity'])
            
            # CREATE STOCK TRANSACTIONS
            StockTransaction.objects.create(
                product=self.product,
                store=self.from_store,
                transaction_type=StockTransaction.TRANSFER_OUT,
                quantity=self.quantity,
                remarks=f"Transferred to {self.to_store.name}",
                performed_by=self.performed_by,
                reference=self
            )
            
            StockTransaction.objects.create(
                product=self.product,
                store=self.to_store,
                transaction_type=StockTransaction.TRANSFER_IN,
                quantity=self.quantity,
                remarks=f"Transferred from {self.from_store.name}",
                performed_by=self.performed_by,
                reference=self
            )
        
        # Save the transfer record
        super().save(*args, **kwargs)
        
        if is_new:
            # Refresh stock objects to get updated quantities
            from_stock.refresh_from_db()
            to_stock.refresh_from_db()


# bulk 

class BulkRestock(models.Model):
    store = models.ForeignKey("inventory.Store", on_delete=models.CASCADE, related_name="bulk_restocks")
    category = models.ForeignKey("inventory.Category", on_delete=models.SET_NULL, null=True, blank=True)
    include_all = models.BooleanField(default=False)
    generated_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-generated_at']
    
    def __str__(self):
        return f"Restock for {self.store.name} - {self.generated_at.strftime('%Y-%m-%d')}"
    
    @property
    def items_count(self):
        return self.items.count()
    
    @transaction.atomic
    def process_restock(self):
        """Process the restock - update all items with new quantities"""
        for item in self.items.all():
            # Update store stock
            store_stock, created = StoreStock.objects.get_or_create(
                store=self.store,
                product=item.product,
                defaults={'quantity': item.new_quantity}
            )
            
            if not created:
                store_stock.quantity = item.new_quantity
                store_stock.save()
            
            # Create stock transaction
            StockTransaction.objects.create(
                product=item.product,
                store=self.store,
                transaction_type=StockTransaction.IN,
                quantity=item.new_quantity - item.current_quantity,
                remarks=f"Bulk restock from Excel",
                performed_by=None,  # Can be set when processing
                reference=f"BULK-{self.id}"
            )
        
        self.completed = True
        self.completed_at = timezone.now()
        self.save()
        return True


class BulkRestockItem(models.Model):
    restock = models.ForeignKey(BulkRestock, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("inventory.Product", on_delete=models.CASCADE)
    current_quantity = models.PositiveIntegerField()
    new_quantity = models.PositiveIntegerField()
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    new_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    class Meta:
        unique_together = ['restock', 'product']
    
    def __str__(self):
        return f"{self.product.name} - {self.current_quantity} → {self.new_quantity}"
    
    @property
    def quantity_change(self):
        return self.new_quantity - self.current_quantity