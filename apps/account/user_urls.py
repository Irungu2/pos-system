# user_urls# users/urls.py
from django.urls import path
from .user_views import user_list, user_create, user_update, user_delete

urlpatterns = [
    path("", user_list, name="user_list"),
    path("create/", user_create, name="user_create"),
    path("<uuid:pk>/edit/", user_update, name="user_update"),
    path("<uuid:pk>/delete/", user_delete, name="user_delete"),
]