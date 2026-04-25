# apps/inventory/serializers.py

from rest_framework import serializers
from .models import (
    Category, Product, Store, StoreStock,
    StockTransaction, StockTransfer, BulkRestock, BulkRestockItem
)

# ============================================================
#  CATEGORY SERIALIZERS
# ============================================================

class CategorySerializer(serializers.ModelSerializer):
    products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'products_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'products_count']
    
    def get_products_count(self, obj):
        return obj.products.count()


# ============================================================
#  STORE & STOCK SERIALIZERS
# ============================================================

class StoreSerializer(serializers.ModelSerializer):
    total_products = serializers.SerializerMethodField()
    low_stock_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Store
        fields = [
            'id', 'name', 'location', 'store_type',
            'is_default_warehouse', 'is_warehouse', 'is_retail',
            'total_products', 'low_stock_count'
        ]
        read_only_fields = ['id', 'is_warehouse', 'is_retail', 'total_products', 'low_stock_count']
    
    def get_total_products(self, obj):
        return obj.get_total_products()
    
    def get_low_stock_count(self, obj):
        return obj.get_low_stock_products().count()


class StoreStockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_category = serializers.CharField(source='product.category.name', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    store_type = serializers.CharField(source='store.store_type', read_only=True)
    is_low_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = StoreStock
        fields = [
            'id', 'store', 'store_name', 'store_type', 'product', 'product_name',
            'product_sku', 'product_category', 'quantity', 'is_low_stock', 'last_updated'
        ]
        read_only_fields = ['id', 'last_updated', 'is_low_stock']
    
    def get_is_low_stock(self, obj):
        return obj.quantity <= obj.product.reorder_level


# ============================================================
#  PRODUCT SERIALIZERS
# ============================================================

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_status = serializers.SerializerMethodField()
    available_stock = serializers.ReadOnlyField()
    warehouse_stock = serializers.ReadOnlyField()
    total_stock = serializers.ReadOnlyField(source='stock_quantity')
    store_stocks = StoreStockSerializer(source='storestock_set', many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'barcode', 'name', 'category', 'category_name',
            'description', 'cost_price', 'selling_price', 'reorder_level',
            'available_stock', 'warehouse_stock', 'total_stock', 'stock_status',
            'store_stocks', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sku', 'created_at', 'updated_at',
            'available_stock', 'warehouse_stock', 'total_stock',
            'stock_status', 'store_stocks'
        ]
    
    def get_stock_status(self, obj):
        if obj.available_stock == 0:
            return 'out_of_stock'
        elif obj.available_stock <= obj.reorder_level:
            return 'low_stock'
        return 'in_stock'


class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'name', 'category', 'description',
            'cost_price', 'selling_price',
            'reorder_level', 'is_active'
        ]
    
    def create(self, validated_data):
        return Product.objects.create(**validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    available_stock = serializers.ReadOnlyField()
    stock_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'category_name',
            'selling_price', 'available_stock',
            'stock_status', 'is_active'
        ]
    
    def get_stock_status(self, obj):
        if obj.available_stock == 0:
            return 'out_of_stock'
        elif obj.available_stock <= obj.reorder_level:
            return 'low_stock'
        return 'in_stock'


# ============================================================
#  STOCK TRANSACTION SERIALIZERS
# ============================================================

from rest_framework import serializers

from rest_framework import serializers

class StockTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    transfer_to_store_name = serializers.CharField(
        source='transfer_to_store.name', read_only=True, allow_null=True
    )
    performed_by = serializers.SerializerMethodField()  # <- changed here

    class Meta:
        model = StockTransaction
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'store', 'store_name', 'transaction_type', 'quantity',
            'transfer_to_store', 'transfer_to_store_name',
            'performed_by',  # full name now
            'reference', 'timestamp', 'remarks'
        ]
        read_only_fields = ['id', 'timestamp']


    def get_performed_by(self, obj):
        if obj.performed_by:
            name = obj.performed_by.get_full_name()
            # optionally include role
            return f"{name} ({obj.performed_by.role})"
        return None

# ============================================================
#  STOCK TRANSFER SERIALIZERS
# ============================================================


class StockTransferSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    from_store_name = serializers.CharField(source='from_store.name', read_only=True)
    to_store_name = serializers.CharField(source='to_store.name', read_only=True)
    performed_by_name = serializers.CharField(
        source='performed_by.get_full_name', 
        read_only=True
    )
    source_stock_before = serializers.SerializerMethodField()
    source_stock_after = serializers.SerializerMethodField()
    destination_stock_before = serializers.SerializerMethodField()
    destination_stock_after = serializers.SerializerMethodField()
    
    class Meta:
        model = StockTransfer
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'from_store', 'from_store_name', 'to_store', 'to_store_name',
            'quantity', 'performed_by', 'performed_by_name', 'status',
            'source_stock_before', 'source_stock_after',
            'destination_stock_before', 'destination_stock_after',
            'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'status', 'performed_by']
    
    def get_source_stock_before(self, obj):
        """Get source store stock before transfer"""
        try:
            stock = StoreStock.objects.get(
                store=obj.from_store, 
                product=obj.product
            )
            return stock.quantity + obj.quantity  # Add back the transferred amount
        except StoreStock.DoesNotExist:
            return 0
    
    def get_source_stock_after(self, obj):
        """Get source store stock after transfer"""
        try:
            stock = StoreStock.objects.get(
                store=obj.from_store, 
                product=obj.product
            )
            return stock.quantity
        except StoreStock.DoesNotExist:
            return 0
    
    def get_destination_stock_before(self, obj):
        """Get destination store stock before transfer"""
        try:
            stock = StoreStock.objects.get(
                store=obj.to_store, 
                product=obj.product
            )
            return stock.quantity - obj.quantity  # Subtract the transferred amount
        except StoreStock.DoesNotExist:
            return 0
    
    def get_destination_stock_after(self, obj):
        """Get destination store stock after transfer"""
        try:
            stock = StoreStock.objects.get(
                store=obj.to_store, 
                product=obj.product
            )
            return stock.quantity
        except StoreStock.DoesNotExist:
            return obj.quantity  # If it was created during transfer


class StockTransferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockTransfer
        fields = ['product', 'from_store', 'to_store', 'quantity', 'notes']
    
    def validate(self, data):
        product = data['product']
        from_store = data['from_store']
        to_store = data['to_store']
        quantity = data['quantity']
        
        # Basic validation
        if quantity <= 0:
            raise serializers.ValidationError({
                'quantity': 'Quantity must be greater than 0'
            })
        
        if from_store == to_store:
            raise serializers.ValidationError({
                'to_store': 'Source and destination cannot be the same store'
            })
        
        # Store type validation
        if from_store.store_type == Store.RETAIL and to_store.store_type == Store.WAREHOUSE:
            raise serializers.ValidationError({
                'to_store': 'Transfers from retail to warehouse are not allowed'
            })
        
        # Stock availability validation
        try:
            stock = StoreStock.objects.get(store=from_store, product=product)
            if stock.quantity < quantity:
                raise serializers.ValidationError({
                    'quantity': f'Insufficient stock in {from_store.name}. Available: {stock.quantity}'
                })
        except StoreStock.DoesNotExist:
            raise serializers.ValidationError({
                'from_store': f'No stock found in {from_store.name} for {product.name}'
            })
        
        return data


# ============================================================
#  PRODUCT STOCK SUMMARY / INVENTORY DASHBOARD
# ============================================================

class ProductStockSummarySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    available_stock = serializers.ReadOnlyField()
    warehouse_stock = serializers.ReadOnlyField()
    total_stock = serializers.ReadOnlyField(source='stock_quantity')
    stock_status = serializers.SerializerMethodField()
    store_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'category_name',
            'available_stock', 'warehouse_stock',
            'total_stock', 'stock_status', 'store_details'
        ]
    
    def get_stock_status(self, obj):
        if obj.available_stock == 0:
            return 'out_of_stock'
        if obj.available_stock <= obj.reorder_level:
            return 'low_stock'
        return 'in_stock'
    
    def get_store_details(self, obj):
        stocks = StoreStock.objects.filter(product=obj).select_related('store')
        return StoreStockSerializer(stocks, many=True).data


class InventoryDashboardSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_categories = serializers.IntegerField()
    total_stores = serializers.IntegerField()
    low_stock_products = serializers.IntegerField()
    out_of_stock_products = serializers.IntegerField()
    total_inventory_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    recent_transactions = StockTransactionSerializer(many=True)
    low_stock_alerts = ProductStockSummarySerializer(many=True)


# ============================================================
#  POS SERIALIZERS
# ============================================================

class POSProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    available_quantity = serializers.IntegerField(read_only=True)
    stock_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'name', 'category_name',
            'selling_price', 'available_quantity',
            'stock_status', 'barcode'
        ]
    
    def get_stock_status(self, obj):
        qty = getattr(obj, 'available_quantity', obj.available_stock)
        if qty == 0:
            return 'out_of_stock'
        if qty <= obj.reorder_level:
            return 'low_stock'
        return 'in_stock'


# ============================================================
#  STORE STOCK UPDATE
# ============================================================

class StoreStockUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreStock
        fields = ['quantity']
    
    def update(self, instance, validated_data):
        new_qty = validated_data.get('quantity', instance.quantity)
        
        StockTransaction.objects.create(
            product=instance.product,
            store=instance.store,
            transaction_type=(
                StockTransaction.IN if new_qty > instance.quantity else StockTransaction.OUT
            ),
            quantity=abs(new_qty - instance.quantity),
            performed_by=self.context.get('request').user,
            remarks="Manual stock adjustment"
        )
        
        instance.quantity = new_qty
        instance.save()
        return instance


# ===============================
# buil 
# ============================================================


class BulkRestockItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    
    class Meta:
        model = BulkRestockItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'current_quantity', 'new_quantity', 'quantity_change',
            'current_price', 'new_price'
        ]
        read_only_fields = ['id']


class BulkRestockSerializer(serializers.ModelSerializer):
    items = BulkRestockItemSerializer(many=True, read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = BulkRestock
        fields = [
            'id', 'store', 'store_name', 'category', 'category_name',
            'include_all', 'generated_at', 'completed', 'completed_at',
            'notes', 'items_count', 'items'
        ]
        read_only_fields = ['id', 'generated_at', 'completed', 'completed_at', 'items_count']


class GenerateTemplateSerializer(serializers.Serializer):
    store_id = serializers.IntegerField(required=True)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    include_all = serializers.BooleanField(default=False)
    low_stock_only = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class UploadCompletedSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)