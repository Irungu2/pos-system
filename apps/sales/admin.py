from django.contrib import admin
from .models import Sale, SaleItem

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1
    readonly_fields = ['subtotal']

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['sale_id', 'cashier', 'store', 'total_amount', 'timestamp']
    list_filter = ['timestamp', 'store']
    inlines = [SaleItemInline]
    readonly_fields = ['sale_id', 'total_amount', 'timestamp']

@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ['sale', 'product', 'quantity', 'unit_price', 'subtotal']
    list_filter = ['sale__store']
    readonly_fields = ['subtotal']