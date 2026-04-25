from django.contrib import admin
from .models import Category, Product, Store, StoreStock, StockTransaction, StockTransfer

admin.site.register(Category)
admin.site.register(Product)
admin.site.register(Store)
admin.site.register(StoreStock)
admin.site.register(StockTransaction)
admin.site.register(StockTransfer)
