from rest_framework import serializers
from .models import Sale, SaleItem
from apps.account.serializers import UserSerializer
from apps.inventory.serializers import ProductSerializer
from apps.inventory.models import Product

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)
    
    # Include tax amount
    tax_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    # Price before tax
    price = serializers.DecimalField(source='unit_price', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'product_details', 'quantity', 'unit_price', 'price', 'tax_amount', 'subtotal'
        ]
        read_only_fields = ['id', 'price', 'tax_amount', 'subtotal']

class SaleItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate(self, attrs):
        product_id = attrs.get('product_id')
        quantity = attrs.get('quantity')

        # Lookup product
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise serializers.ValidationError({'product_id': 'Invalid product ID.'})

        # Stock check
        if product.stock_quantity < quantity:
            raise serializers.ValidationError(
                {'quantity': f"Insufficient stock for {product.name}. Available: {product.stock_quantity}"}
            )

        # Convert product_id → product instance
        attrs['product'] = product
        del attrs['product_id']

        # Default unit_price from product
        if 'unit_price' not in attrs or product.fixed_price:
            attrs['unit_price'] = product.selling_price

        return attrs

class SaleSerializer(serializers.ModelSerializer):
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    cashier_details = UserSerializer(source='cashier', read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Sale
        fields = [
            'sale_id', 'cashier', 'cashier_name', 'cashier_details',
            'total_amount', 'timestamp', 'items', 'items_count'
        ]
        read_only_fields = ['sale_id', 'total_amount', 'timestamp']

    def get_items_count(self, obj):
        return obj.items.count()

class SaleCreateSerializer(serializers.ModelSerializer):
    items = SaleItemCreateSerializer(many=True)

    class Meta:
        model = Sale
        fields = ['cashier', 'items']  # cashier is writable

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        sale = Sale.objects.create(**validated_data)

        total_amount = 0

        for item_data in items_data:
            product = item_data['product']
            quantity = item_data['quantity']
            unit_price = item_data['unit_price']

            tax_amount = (unit_price * product.tax_rate / 100) * quantity if product.is_taxable else 0
            subtotal = (unit_price * quantity) + tax_amount

            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                tax_amount=tax_amount,
                subtotal=subtotal
            )

            total_amount += subtotal

        sale.total_amount = total_amount
        sale.save()

        return sale


class SaleSummarySerializer(serializers.ModelSerializer):
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    items_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'sale_id', 'cashier_name', 'total_amount', 
            'timestamp', 'items_count'
        ]
