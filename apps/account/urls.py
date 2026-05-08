from django.urls import path
from .views import login_view, set_store, logout_view

urlpatterns = [
    path("login/", login_view, name="login"),
    path("set-store/", set_store, name="set_store"),
    # path("", dashboard_view, name="dashboard2"),  # clearer name
    path("logout/", logout_view, name="logout"),
]


