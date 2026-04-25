# # apps/sales/urls.py
# from django.urls import path
# from . import views

# urlpatterns = [
#     path('dashboard/', views.sales_dashboard, name='sales_dashboard'),
#     path('manager-dashboard/', views.manager_dashboard, name='manager_dashboard'),
#     path('pos/', views.pos_interface, name='pos_interface'),
#     path('my-sales/', views.my_sales, name='my_sales'),
#     path('sale/<uuid:sale_id>/', views.sale_detail, name='sale_detail'),
# ]
# apps/sales/urls.py
from django.urls import path
from . import views
from .import  managerview 
urlpatterns = [
    # Template views
    path('', views.sales_dashboard, name='sales_dashboard'),
    path('pos/', views.pos_interface, name='pos_interface'),
    path('my-sales/', views.my_sales, name='my_sales'),
    path('sale/<uuid:sale_id>/', views.sale_detail, name='sale_detail'),
    
    # API endpoints
    path('api/my-sales/', views.api_my_sales, name='api_my_sales'),
    # path('api/today-sales/', views.api_today_sales, name='api_today_sales'),
    path('api/create-sale/', views.api_create_sale, name='api_create_sale'),
    # path('api/sale/<uuid:sale_id>/', views.api_sale_detail, name='api_sale_detail'),


    # admin\

    path('manager-dashboard/', managerview.manager_dashboard, name='manager_dashboard'),
    
]