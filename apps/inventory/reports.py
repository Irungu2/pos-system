# reports.py
from django.db.models import Sum, Count, Avg, F, Q, Case, When, Value, FloatField
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek, ExtractHour, Cast
from datetime import datetime, timedelta
import pandas as pd
from decimal import Decimal
from django.utils import timezone
from django.db.models import QuerySet
from apps.sales.models import Sale, SaleItem
from apps.account.models import User
from .models import (
    Category,
    Product,
    Store,
    StoreStock,
    StockTransaction,
    StockTransfer,
    BulkRestock,
    BulkRestockItem
)


class InventorySalesReportGenerator:
    
    def __init__(self, store=None, start_date=None, end_date=None):
        self.store = store
        self.start_date = start_date or (timezone.now() - timedelta(days=30))
        self.end_date = end_date or timezone.now()
    
    def _ensure_serializable(self, data):
        """
        Recursively convert all data to JSON-serializable types
        """
        if isinstance(data, dict):
            return {k: self._ensure_serializable(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [self._ensure_serializable(item) for item in data]
        elif isinstance(data, QuerySet):
            return list(data)
        elif hasattr(data, '__iter__') and not isinstance(data, (str, bytes)):
            return list(data)
        elif isinstance(data, Decimal):
            return float(data)
        elif isinstance(data, (datetime, timezone.datetime)):
            return data.isoformat() if hasattr(data, 'isoformat') else str(data)
        elif hasattr(data, '__dict__'):
            # Handle model instances
            return str(data)
        else:
            return data
    
    # ---------------------------
    # SALES-RELATED REPORTS
    # ---------------------------
    
    def generate_sales_summary_report(self, group_by='daily', cashier=None):
        """
        Sales summary report with various grouping options
        """
        sales = Sale.objects.filter(
            timestamp__gte=self.start_date,
            timestamp__lte=self.end_date
        )
        
        if self.store:
            sales = sales.filter(store=self.store)
        
        if cashier:
            sales = sales.filter(cashier=cashier)
        
        # Group sales
        if group_by == 'daily':
            sales = sales.annotate(period=TruncDate('timestamp'))
        elif group_by == 'weekly':
            sales = sales.annotate(period=TruncWeek('timestamp'))
        elif group_by == 'monthly':
            sales = sales.annotate(period=TruncMonth('timestamp'))
        elif group_by == 'hourly':
            sales = sales.annotate(period=ExtractHour('timestamp'))
        else:
            sales = sales.annotate(period=TruncDate('timestamp'))
        
        # First get basic aggregates
        sales_data = sales.values('period').annotate(
            total_sales=Count('id'),
            total_amount=Sum('total_amount'),
            total_items=Sum('items__quantity')
        ).order_by('period')
        
        # Get detailed period data and calculate avg manually
        period_data = []
        for period in sales_data:
            period_sales = sales.filter(period=period['period'])
            
            # Calculate average transaction manually
            avg_transaction = 0
            if period['total_sales'] > 0 and period['total_amount']:
                avg_transaction = period['total_amount'] / period['total_sales']
            
            # Get top products for this period
            top_products = SaleItem.objects.filter(
                sale__in=period_sales
            ).values(
                'product__name', 'product__sku'
            ).annotate(
                total_quantity=Sum('quantity'),
                total_revenue=Sum('subtotal')
            ).order_by('-total_quantity')[:5]
            
            period_data.append({
                'period': period['period'].isoformat() if hasattr(period['period'], 'isoformat') else str(period['period']),
                'total_sales': period['total_sales'],
                'total_amount': float(period['total_amount'] or 0),
                'avg_transaction': float(avg_transaction),
                'total_items': period['total_items'] or 0,
                'top_products': list(top_products),
                'sales_per_hour': list(self._get_sales_by_hour(period_sales)) if group_by == 'daily' else None
            })
        
        report = {
            'report_type': 'SALES_SUMMARY',
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'start_date': self.start_date.date().isoformat(),
                'end_date': self.end_date.date().isoformat(),
                'store': str(self.store) if self.store else 'All',
                'group_by': group_by,
                'cashier': cashier.get_full_name() if cashier else 'All'
            },
            'summary': {
                'total_periods': len(period_data),
                'grand_total_sales': sum(p['total_amount'] for p in period_data),
                'grand_total_transactions': sum(p['total_sales'] for p in period_data),
                'average_daily_sales': sum(p['total_amount'] for p in period_data) / len(period_data) if period_data else 0,
            },
            'data': period_data
        }
        
        return self._ensure_serializable(report)
    
    def generate_product_sales_report(self, product=None, category=None, top_n=20):
        """
        Product-wise sales performance
        """
        sale_items = SaleItem.objects.filter(
            sale__timestamp__gte=self.start_date,
            sale__timestamp__lte=self.end_date
        )
        
        if self.store:
            sale_items = sale_items.filter(sale__store=self.store)
        
        if product:
            sale_items = sale_items.filter(product=product)
        elif category:
            sale_items = sale_items.filter(product__category=category)
        
        # Group by product
        product_sales = sale_items.values(
            'product__name',
            'product__sku',
            'product__category__name',
            'product__selling_price',
            'product__cost_price',
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum('subtotal'),
            total_tax=Sum('tax_amount'),
            avg_selling_price=Avg('unit_price')
        ).order_by('-total_revenue')[:top_n]
        
        # Convert QuerySet to list
        product_sales_list = list(product_sales)
        
        # Calculate profitability metrics
        report_data = []
        for ps in product_sales_list:
            total_cost = ps['total_quantity'] * (ps['product__cost_price'] or 0)
            gross_profit = (ps['total_revenue'] or 0) - total_cost - (ps['total_tax'] or 0)
            margin = (gross_profit / ps['total_revenue'] * 100) if ps['total_revenue'] and ps['total_revenue'] > 0 else 0
            
            # Get sales trend (last 7 days vs previous 7 days)
            trend = self._get_sales_trend(ps['product__sku'])
            
            report_data.append({
                'product_name': ps['product__name'],
                'sku': ps['product__sku'],
                'category': ps['product__category__name'] or 'Uncategorized',
                'total_quantity': ps['total_quantity'] or 0,
                'total_revenue': float(ps['total_revenue'] or 0),
                'total_tax': float(ps['total_tax'] or 0),
                'avg_selling_price': float(ps['avg_selling_price'] or ps['product__selling_price'] or 0),
                'cost_price': float(ps['product__cost_price'] or 0),
                'total_cost': float(total_cost),
                'gross_profit': float(gross_profit),
                'profit_margin': float(margin),
                'sales_trend': trend,
                'rank': len(report_data) + 1
            })
        
        report = {
            'report_type': 'PRODUCT_SALES',
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'start_date': self.start_date.date().isoformat(),
                'end_date': self.end_date.date().isoformat(),
                'store': str(self.store) if self.store else 'All',
                'product': str(product) if product else 'All',
                'category': str(category) if category else 'All',
                'top_n': top_n
            },
            'summary': {
                'total_products': len(report_data),
                'total_revenue': sum(p['total_revenue'] for p in report_data),
                'total_profit': sum(p['gross_profit'] for p in report_data),
                'avg_profit_margin': sum(p['profit_margin'] for p in report_data) / len(report_data) if report_data else 0,
                'top_selling_product': report_data[0]['product_name'] if report_data else None,
                'most_profitable_product': max(report_data, key=lambda x: x['profit_margin'])['product_name'] if report_data else None,
            },
            'data': report_data
        }
        
        return self._ensure_serializable(report)
    
    def generate_cashier_performance_report(self):
        """
        Cashier/employee performance report
        """
        cashiers = User.objects.filter(sales__isnull=False).distinct()
        
        performance_data = []
        for cashier in cashiers:
            cashier_sales = Sale.objects.filter(
                cashier=cashier,
                timestamp__gte=self.start_date,
                timestamp__lte=self.end_date
            )
            
            if self.store:
                cashier_sales = cashier_sales.filter(store=self.store)
            
            total_sales = cashier_sales.count()
            if total_sales == 0:
                continue
            
            # Get aggregates separately
            total_amount_result = cashier_sales.aggregate(
                total=Sum('total_amount')
            )
            total_amount = total_amount_result['total'] or 0
            
            total_items_result = cashier_sales.aggregate(
                total=Sum('items__quantity')
            )
            total_items = total_items_result['total'] or 0
            
            # Calculate average transaction manually
            avg_transaction = total_amount / total_sales if total_sales > 0 else 0
            avg_items = total_items / total_sales if total_sales > 0 else 0
            
            # Get sales by hour/shift
            sales_by_hour = cashier_sales.annotate(
                hour=ExtractHour('timestamp')
            ).values('hour').annotate(
                count=Count('id'),
                amount=Sum('total_amount')
            ).order_by('hour')
            
            performance_data.append({
                'cashier_name': cashier.get_full_name() or cashier.unique_id,
                'cashier_id': cashier.id,
                'total_sales': total_sales,
                'total_amount': float(total_amount),
                'avg_transaction': float(avg_transaction),
                'total_items': total_items,
                'avg_items_per_sale': float(avg_items),
                'sales_by_hour': list(sales_by_hour),
                'performance_score': self._calculate_performance_score(
                    total_sales, 
                    total_amount,
                    avg_items
                )
            })
        
        # Sort by total amount
        performance_data.sort(key=lambda x: x['total_amount'], reverse=True)
        
        # Add ranking
        for i, data in enumerate(performance_data):
            data['rank'] = i + 1
        
        report = {
            'report_type': 'CASHIER_PERFORMANCE',
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'start_date': self.start_date.date().isoformat(),
                'end_date': self.end_date.date().isoformat(),
                'store': str(self.store) if self.store else 'All'
            },
            'summary': {
                'total_cashiers': len(performance_data),
                'total_revenue': sum(p['total_amount'] for p in performance_data),
                'avg_revenue_per_cashier': sum(p['total_amount'] for p in performance_data) / len(performance_data) if performance_data else 0,
                'top_cashier': performance_data[0]['cashier_name'] if performance_data else None,
                'best_avg_transaction': max(performance_data, key=lambda x: x['avg_transaction'])['cashier_name'] if performance_data else None,
            },
            'data': performance_data
        }
        
        return self._ensure_serializable(report)
    
    def generate_tax_report(self):
        """
        Detailed tax report for taxable sales
        """
        taxable_items = SaleItem.objects.filter(
            sale__timestamp__gte=self.start_date,
            sale__timestamp__lte=self.end_date,
            product__is_taxable=True
        )
        
        if self.store:
            taxable_items = taxable_items.filter(sale__store=self.store)
        
        # Group by tax rate
        tax_data = taxable_items.values(
            'product__tax_rate'
        ).annotate(
            total_taxable_amount=Sum(F('unit_price') * F('quantity')),
            total_tax=Sum('tax_amount'),
            transaction_count=Count('sale', distinct=True),
            item_count=Sum('quantity')
        ).order_by('-product__tax_rate')
        
        detailed_data = []
        for tax_group in tax_data:
            # Get products in this tax bracket
            products = taxable_items.filter(
                product__tax_rate=tax_group['product__tax_rate']
            ).values(
                'product__name',
                'product__sku'
            ).annotate(
                product_tax=Sum('tax_amount'),
                product_sales=Sum('subtotal')
            ).order_by('-product_tax')[:10]
            
            total_taxable = tax_group['total_taxable_amount'] or 0
            total_tax = tax_group['total_tax'] or 0
            
            detailed_data.append({
                'tax_rate': float(tax_group['product__tax_rate'] or 0),
                'total_taxable_amount': float(total_taxable),
                'total_tax_collected': float(total_tax),
                'transaction_count': tax_group['transaction_count'],
                'item_count': tax_group['item_count'] or 0,
                'top_taxable_products': list(products),
                'tax_percentage_of_sales': (total_tax / total_taxable * 100) if total_taxable > 0 else 0
            })
        
        # Calculate non-taxable sales for comparison
        non_taxable_sales = SaleItem.objects.filter(
            sale__timestamp__gte=self.start_date,
            sale__timestamp__lte=self.end_date,
            product__is_taxable=False
        )
        
        if self.store:
            non_taxable_sales = non_taxable_sales.filter(sale__store=self.store)
        
        non_taxable_total = non_taxable_sales.aggregate(
            total=Sum('subtotal')
        )['total'] or 0
        
        report = {
            'report_type': 'TAX_REPORT',
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'start_date': self.start_date.date().isoformat(),
                'end_date': self.end_date.date().isoformat(),
                'store': str(self.store) if self.store else 'All'
            },
            'summary': {
                'total_tax_collected': sum(t['total_tax_collected'] for t in detailed_data),
                'total_taxable_sales': sum(t['total_taxable_amount'] for t in detailed_data),
                'total_non_taxable_sales': float(non_taxable_total),
                'tax_brackets': len(detailed_data),
                'avg_tax_rate': sum(t['tax_rate'] * t['total_taxable_amount'] for t in detailed_data) / sum(t['total_taxable_amount'] for t in detailed_data) if sum(t['total_taxable_amount'] for t in detailed_data) > 0 else 0,
            },
            'data': detailed_data
        }
        
        return self._ensure_serializable(report)
    
    # ---------------------------
    # INTEGRATED REPORTS (INVENTORY + SALES)
    # ---------------------------
    
    def generate_sales_vs_stock_report(self):
        """
        Compare sales velocity with current stock levels
        """
        products = Product.objects.filter(is_active=True).select_related('category')
        
        report_data = []
        for product in products:
            # Get sales data for last 30 days
            thirty_days_ago = timezone.now() - timedelta(days=30)
            sales_items = SaleItem.objects.filter(
                product=product,
                sale__timestamp__gte=thirty_days_ago
            )
            
            if self.store:
                sales_items = sales_items.filter(sale__store=self.store)
            
            sales_summary = sales_items.aggregate(
                total_sold=Sum('quantity'),
                total_revenue=Sum('subtotal')
            )
            
            total_sold = sales_summary['total_sold'] or 0
            avg_daily_sales = total_sold / 30 if total_sold > 0 else 0
            
            # Get current stock
            current_stock = product.stock_quantity
            warehouse_stock = product.warehouse_stock
            
            # Calculate metrics
            days_of_supply = current_stock / avg_daily_sales if avg_daily_sales > 0 else 999
            sales_velocity = total_sold / 30  # per day
            turnover_ratio = total_sold / current_stock if current_stock > 0 else 0
            
            # Risk assessment
            if days_of_supply < 7:
                stock_risk = 'HIGH'
            elif days_of_supply < 14:
                stock_risk = 'MEDIUM'
            else:
                stock_risk = 'LOW'
            
            # Suggestion
            if stock_risk == 'HIGH' and avg_daily_sales > 0:
                suggested_order = max(avg_daily_sales * 14, product.reorder_level * 2)
            else:
                suggested_order = 0
            
            report_data.append({
                'product_name': product.name,
                'sku': product.sku,
                'category': product.category.name if product.category else 'Uncategorized',
                'current_stock': current_stock,
                'warehouse_stock': warehouse_stock,
                'sales_last_30_days': total_sold,
                'avg_daily_sales': round(avg_daily_sales, 2),
                'days_of_supply': round(days_of_supply, 1),
                'sales_velocity': round(sales_velocity, 2),
                'stock_turnover': round(turnover_ratio, 2),
                'reorder_level': product.reorder_level,
                'stock_risk': stock_risk,
                'suggested_order_qty': int(suggested_order),
                'current_vs_sales': 'Overstocked' if days_of_supply > 60 else 'Balanced' if days_of_supply > 14 else 'Understocked'
            })
        
        report = {
            'report_type': 'SALES_VS_STOCK',
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'store': str(self.store) if self.store else 'All',
                'period': '30_days'
            },
            'summary': {
                'total_products': len(report_data),
                'high_risk_items': sum(1 for p in report_data if p['stock_risk'] == 'HIGH'),
                'avg_days_of_supply': sum(p['days_of_supply'] for p in report_data) / len(report_data) if report_data else 0,
                'avg_sales_velocity': sum(p['avg_daily_sales'] for p in report_data) / len(report_data) if report_data else 0,
                'total_suggested_order': sum(p['suggested_order_qty'] for p in report_data),
            },
            'data': sorted(report_data, key=lambda x: (x['stock_risk'] != 'LOW', x['stock_risk'] != 'MEDIUM', -x['days_of_supply']))
        }
        
        return self._ensure_serializable(report)
    
    def generate_profitability_by_category(self):
        """
        Profitability analysis by product category
        """
        categories = Category.objects.filter(is_active=True)
        
        category_data = []
        for category in categories:
            # Get all products in category
            products = category.products.filter(is_active=True)
            
            # Calculate total inventory value
            inventory_value = 0
            for product in products:
                stock = product.stock_quantity
                inventory_value += stock * product.cost_price
            
            # Get sales for last 30 days
            thirty_days_ago = timezone.now() - timedelta(days=30)
            category_sales = SaleItem.objects.filter(
                product__category=category,
                sale__timestamp__gte=thirty_days_ago
            )
            
            if self.store:
                category_sales = category_sales.filter(sale__store=self.store)
            
            sales_summary = category_sales.aggregate(
                total_revenue=Sum('subtotal'),
                total_cost=Sum(F('product__cost_price') * F('quantity')),
                total_tax=Sum('tax_amount'),
                total_quantity=Sum('quantity')
            )
            
            total_revenue = sales_summary['total_revenue'] or 0
            total_cost = sales_summary['total_cost'] or 0
            total_tax = sales_summary['total_tax'] or 0
            total_quantity = sales_summary['total_quantity'] or 0
            
            # Calculate profitability
            gross_profit = total_revenue - total_cost - total_tax
            profit_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0
            
            # Inventory turnover
            avg_inventory = inventory_value / 2  # Simplified
            turnover = total_cost / avg_inventory if avg_inventory > 0 else 0
            
            category_data.append({
                'category_name': category.name,
                'product_count': products.count(),
                'total_inventory_value': float(inventory_value),
                'sales_last_30_days': total_quantity,
                'total_revenue': float(total_revenue),
                'total_cost': float(total_cost),
                'gross_profit': float(gross_profit),
                'profit_margin': float(profit_margin),
                'inventory_turnover': float(turnover),
                'performance_rating': self._get_category_rating(profit_margin, turnover),
                'top_products': list(self._get_top_products_in_category(category, 3))
            })
        
        # Sort by profitability
        category_data.sort(key=lambda x: x['profit_margin'], reverse=True)
        
        report = {
            'report_type': 'CATEGORY_PROFITABILITY',
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'store': str(self.store) if self.store else 'All',
                'period': '30_days'
            },
            'summary': {
                'total_categories': len(category_data),
                'most_profitable_category': category_data[0]['category_name'] if category_data else None,
                'highest_turnover_category': max(category_data, key=lambda x: x['inventory_turnover'])['category_name'] if category_data else None,
                'total_profit_all_categories': sum(c['gross_profit'] for c in category_data),
                'avg_profit_margin': sum(c['profit_margin'] for c in category_data) / len(category_data) if category_data else 0,
            },
            'data': category_data
        }
        
        return self._ensure_serializable(report)


    def generate_end_of_day_report(self, date=None):
        if not date:
            date = timezone.now().date()

        daily_sales = Sale.objects.filter(
            timestamp__date=date,
            status="completed"
        )

        cashier_performance = daily_sales.values(
            'cashier__unique_id',
            'cashier__first_name',
            'cashier__last_name'
        ).annotate(
            sales_count=Count('id'),
            total_amount=Sum('total_amount')
        ).order_by('-total_amount')

        cashier_performance_list = []
        for cp in cashier_performance:
            avg_transaction = (
                cp['total_amount'] / cp['sales_count']
                if cp['sales_count'] > 0 else 0
            )

            cashier_name = f"{cp['cashier__first_name'] or ''} {cp['cashier__last_name'] or ''}".strip()
            if not cashier_name:
                cashier_name = cp['cashier__unique_id']

            cashier_performance_list.append({
                'cashier': cashier_name,
                'sales_count': cp['sales_count'],
                'total_amount': float(cp['total_amount'] or 0),
                'avg_transaction': float(avg_transaction)
            })

        return cashier_performance_list
    # ---------------------------
    # HELPER METHODS
    # ---- -----------------------
    
    def _get_sales_by_hour(self, sales_queryset):
        """Get sales distribution by hour"""
        hourly_data = sales_queryset.annotate(
            hour=ExtractHour('timestamp')
        ).values('hour').annotate(
            count=Count('id'),
            amount=Sum('total_amount')
        ).order_by('hour')
        return list(hourly_data)
    
    def _get_sales_trend(self, sku):
        """Calculate sales trend (last 7 days vs previous 7 days)"""
        today = timezone.now().date()
        last_7_start = today - timedelta(days=7)
        prev_7_start = last_7_start - timedelta(days=7)
        
        # Last 7 days sales
        recent_sales = SaleItem.objects.filter(
            product__sku=sku,
            sale__timestamp__date__gte=last_7_start,
            sale__timestamp__date__lt=today
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        # Previous 7 days sales
        previous_sales = SaleItem.objects.filter(
            product__sku=sku,
            sale__timestamp__date__gte=prev_7_start,
            sale__timestamp__date__lt=last_7_start
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        if previous_sales > 0:
            trend = ((recent_sales - previous_sales) / previous_sales) * 100
        else:
            trend = 100 if recent_sales > 0 else 0
        
        return {
            'recent_7_days': recent_sales,
            'previous_7_days': previous_sales,
            'trend_percentage': round(trend, 1),
            'direction': 'up' if trend > 0 else 'down' if trend < 0 else 'stable'
        }
    
    def _calculate_performance_score(self, total_sales, total_amount, avg_items):
        """Calculate cashier performance score (0-100)"""
        # Ensure all inputs are floats
        total_amount_float = float(total_amount) if total_amount else 0
        avg_items_float = float(avg_items) if avg_items else 0
        
        # Simple scoring algorithm
        sales_score = min(total_sales * 2, 40)  # Max 40 points
        revenue_score = min(total_amount_float / 1000, 40)  # $1000 = 1 point, max 40
        efficiency_score = min(avg_items_float * 5, 20)  # Max 20 points
        
        return min(sales_score + revenue_score + efficiency_score, 100)

    def _get_category_rating(self, profit_margin, turnover):
        """Rate category performance"""
        if profit_margin > 40 and turnover > 4:
            return 'EXCELLENT'
        elif profit_margin > 25 and turnover > 2:
            return 'GOOD'
        elif profit_margin > 10:
            return 'AVERAGE'
        else:
            return 'POOR'
    
    def _get_top_products_in_category(self, category, limit=3):
        """Get top selling products in a category"""
        return SaleItem.objects.filter(
            product__category=category,
            sale__timestamp__gte=self.start_date
        ).values(
            'product__name', 'product__sku'
        ).annotate(
            total_sold=Sum('quantity'),
            revenue=Sum('subtotal')
        ).order_by('-total_sold')[:limit]
    
    # ---------------------------
    # COMPREHENSIVE DASHBOARD DATA
    # ---------------------------
    
    def get_dashboard_data(self):
        """
        Get all data needed for dashboard in one call
        """
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)
        last_week_start = today - timedelta(days=7)
        last_month_start = today - timedelta(days=30)
        
        # Today's sales
        today_sales = Sale.objects.filter(
            timestamp__date=today,
            store=self.store
        ).aggregate(
            total=Sum('total_amount'),
            count=Count('id')
        )
        
        # Yesterday's sales for comparison
        yesterday_sales = Sale.objects.filter(
            timestamp__date=yesterday,
            store=self.store
        ).aggregate(
            total=Sum('total_amount')
        )
        
        # Calculate growth
        today_total = today_sales['total'] or 0
        yesterday_total = yesterday_sales['total'] or 0
        if yesterday_total > 0:
            daily_growth = ((today_total - yesterday_total) / yesterday_total) * 100
        else:
            daily_growth = 100 if today_total > 0 else 0
        
        # Top selling products today
        top_products_today = SaleItem.objects.filter(
            sale__timestamp__date=today,
            sale__store=self.store
        ).values(
            'product__name', 'product__sku'
        ).annotate(
            quantity=Sum('quantity'),
            revenue=Sum('subtotal')
        ).order_by('-quantity')[:5]
        
        # Low stock items
        low_stock_items = []
        for product in Product.objects.filter(is_active=True):
            if product.is_low_stock(self.store):
                low_stock_items.append({
                    'name': product.name,
                    'sku': product.sku,
                    'current_stock': product.get_store_stock(self.store) if self.store else product.available_stock,
                    'reorder_level': product.reorder_level,
                    'days_of_supply': self._estimate_days_of_supply(product)
                })
        
        # Recent transactions
        recent_transactions = Sale.objects.filter(
            store=self.store
        ).select_related('cashier').order_by('-timestamp')[:10]
        
        # Sales chart data (last 7 days)
        sales_chart_data = []
        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            day_sales = Sale.objects.filter(
                timestamp__date=date,
                store=self.store
            ).aggregate(total=Sum('total_amount'))
            
            sales_chart_data.append({
                'date': date.strftime('%a'),
                'amount': float(day_sales['total'] or 0)
            })
        
        # Calculate average transaction for today
        avg_transaction_today = 0
        if today_sales['count'] and today_total:
            avg_transaction_today = today_total / today_sales['count']
        
        # Prepare recent transactions list
        recent_transactions_list = []
        for t in recent_transactions:
            recent_transactions_list.append({
                'id': str(t.sale_id) if hasattr(t, 'sale_id') else str(t.id),
                'time': t.timestamp.strftime('%H:%M'),
                'cashier': t.cashier.get_full_name() if t.cashier else 'Unknown',
                'amount': float(t.total_amount),
                'items': t.items.count()
            })
        
        dashboard_data = {
            'today_summary': {
                'total_sales': float(today_total),
                'transaction_count': today_sales['count'] or 0,
                'daily_growth': round(daily_growth, 1),
                'avg_transaction': float(avg_transaction_today),
            },
            'period_comparison': {
                'today': float(today_total),
                'yesterday': float(yesterday_total),
                'last_week': self._get_period_total(last_week_start, today - timedelta(days=1)),
                'last_month': self._get_period_total(last_month_start, today - timedelta(days=1)),
            },
            'top_products_today': list(top_products_today),
            'low_stock_alerts': low_stock_items[:5],
            'recent_transactions': recent_transactions_list,
            'sales_chart': sales_chart_data,
            'inventory_status': {
                'total_products': Product.objects.filter(is_active=True).count(),
                'low_stock_count': len(low_stock_items),
                'out_of_stock': len([p for p in low_stock_items if p['current_stock'] == 0]),
                'total_inventory_value': self._get_total_inventory_value(),
            }
        }
        
        return self._ensure_serializable(dashboard_data)
    
    def _get_period_total(self, start_date, end_date):
        """Helper to get sales total for a period"""
        total = Sale.objects.filter(
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date,
            store=self.store
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        return float(total)
    
    def _get_total_inventory_value(self):
        """Calculate total inventory value"""
        total = 0
        for product in Product.objects.filter(is_active=True):
            stock = product.stock_quantity
            total += stock * (product.cost_price or 0)
        return float(total)
    
    def _estimate_days_of_supply(self, product):
        """Estimate days of supply based on sales history"""
        thirty_days_ago = timezone.now() - timedelta(days=30)
        sales = SaleItem.objects.filter(
            product=product,
            sale__timestamp__gte=thirty_days_ago,
            sale__store=self.store
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        avg_daily = sales / 30
        current_stock = product.get_store_stock(self.store) if self.store else product.available_stock
        
        if avg_daily > 0:
            return round(current_stock / avg_daily, 1)
        return 999