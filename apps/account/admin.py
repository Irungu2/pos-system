from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    # ✅ fields when creating user
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name', 'role', 'stores', 'password1', 'password2'),
        }),
    )

    # ✅ fields when editing user
    fieldsets = (
        (None, {'fields': ('unique_id', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'role', 'stores')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
    )

    # ✅ show stores in list view
    list_display = ('unique_id', 'first_name', 'last_name', 'role', 'get_stores', 'is_staff')

    readonly_fields = ('unique_id',)
    ordering = ('unique_id',)

    # 🔥 show stores nicely in list
    def get_stores(self, obj):
        return ", ".join([store.name for store in obj.stores.all()]) or "-"
    get_stores.short_description = "Stores"

    # 🔥 better UI for selecting stores
    filter_horizontal = ('stores',)