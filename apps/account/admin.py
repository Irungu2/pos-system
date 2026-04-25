from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User

    # fields shown when CREATING a user
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )

    # fields shown when EDITING a user
    fieldsets = (
        (None, {'fields': ('unique_id', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'role')}),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
    )

    list_display = ('unique_id', 'first_name', 'last_name', 'role', 'is_staff')
    readonly_fields = ('unique_id',)
    ordering = ('unique_id',)
