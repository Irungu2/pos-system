# imp
import uuid
import random

from django.db import models, IntegrityError, transaction
from django.utils import timezone
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)


class CustomUserManager(BaseUserManager):
    def create_user(self, password=None, role='cashier', **extra_fields):
        if not password:
            raise ValueError("Users must have a password")

        user = self.model(role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(
            password=password,
            role='admin',
            **extra_fields
        )


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('cashier', 'Cashier'),
        ('sales', 'Sales'),
        ('manager', 'Manager'),
        ('admin', 'Admin'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # 🔐 unique_id is still unique at DB level
    unique_id = models.CharField(
        max_length=4,
        unique=True,
        editable=False,   # 🚫 not editable anywhere
    )

    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='cashier')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = CustomUserManager()

    USERNAME_FIELD = 'unique_id'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.get_full_name()

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.unique_id

    # ===============================
    # 🔥 SAFE UNIQUE ID GENERATION
    # ===============================
    def _generate_unique_id(self):
        return f"{random.randint(0, 9999):04d}"

    def save(self, *args, **kwargs):
        if not self.unique_id:
            for _ in range(10):  # retry limit
                self.unique_id = self._generate_unique_id()
                try:
                    with transaction.atomic():
                        super().save(*args, **kwargs)
                    return
                except IntegrityError:
                    self.unique_id = None
            raise ValueError("Could not generate a unique ID after multiple attempts")
        else:
            super().save(*args, **kwargs)
