from django.contrib import admin
from .models import Category, Product, Store, StoreStock, StockTransaction, StockTransfer,BulkRestockItem,BulkRestock

admin.site.register(Category)
admin.site.register(Product)
admin.site.register(Store)
admin.site.register(StoreStock)
admin.site.register(StockTransaction)
admin.site.register(StockTransfer)
# admin.site.register(BulkRestock)
# admin.site.register(BulkRestockItem)

from django.contrib import admin
from .models import BulkRestock, BulkRestockItem


class BulkRestockItemInline(admin.TabularInline):
    model = BulkRestockItem
    extra = 0
    readonly_fields = (
        'product',
        'current_quantity',
        'new_quantity',
        'quantity_change',
        'current_price',
        'new_price',
    )


@admin.register(BulkRestock)
class BulkRestockAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'store',
        'status',
        'completed',
        'completed_by',
        'items_count',
        'generated_at',
        'completed_at',
    )

    list_filter = (
        'status',
        'completed',
        'store',
        'generated_at',
        'completed_at',
    )

    search_fields = (
        'store__name',
        'notes',
        'completed_by__first_name',
        'completed_by__username',
    )

    readonly_fields = (
        'generated_at',
        'completed_at',
        'items_count',
    )

    ordering = ('-generated_at',)

    inlines = [BulkRestockItemInline]

    fieldsets = (
        ('Main Information', {
            'fields': (
                'store',
                'category',
                'status',
                'include_all',
            )
        }),

        ('Completion Information', {
            'fields': (
                'completed',
                'completed_by',
                'completed_at',
            )
        }),

        ('Other', {
            'fields': (
                'notes',
                'generated_at',
                'items_count',
            )
        }),
    )


@admin.register(BulkRestockItem)
class BulkRestockItemAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'restock',
        'product',
        'current_quantity',
        'new_quantity',
        'quantity_change',
        'current_price',
        'new_price',
    )

    list_filter = (
        'restock__status',
        'restock__store',
    )

    search_fields = (
        'product__name',
        'product__sku',
    )

    readonly_fields = (
        'quantity_change',
    )