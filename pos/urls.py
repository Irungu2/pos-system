"""
URL configuration for pos project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

# from django.contrib import admin
# from django.urls import path, include

# urlpatterns = [
#     path("admin/", admin.site.urls),
#     path("account/", include("apps.account.urls")),
#     path("inventory/", include("apps.inventory.urls")),
#     path("sales/", include("apps.sales.urls")),
#     path("", include("apps.home.urls")),
# ]

# project_root/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth/account routes
    path("account/", include("apps.account.urls")),
    path("users/", include("apps.account.user_urls")),

    # Inventory API routes (prefix as /api/)
    path("inventory/", include("apps.inventory.urls")),

    # Sales routes
    path("sales/", include("apps.sales.urls")),

    # Home page routes
    path("", include("apps.home.urls")),
]
