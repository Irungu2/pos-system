# from django.core.management.base import BaseCommand
# from django.contrib.auth import get_user_model

# class Command(BaseCommand):
#     def handle(self, *args, **kwargs):
#         User = get_user_model()

#         if not User.objects.filter(unique_id="1111").exists():
#             User.objects.create_superuser(
#                 unique_id="1111",
#                 password="admin123"
#             )
#             self.stdout.write("Superuser created.")
#         else:
#             self.stdout.write("Superuser already exists.")


from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from apps.inventory.models import Store


class Command(BaseCommand):
    help = "Create default admin and warehouse"

    def handle(self, *args, **kwargs):

        User = get_user_model()

        # =====================================
        # CREATE DEFAULT STORE
        # =====================================
        store, store_created = Store.objects.get_or_create(
            is_default_warehouse=True,
            defaults={
                "name": "Vision Heritage",
                "location": "Head Office",
                "store_type": Store.WAREHOUSE,
            }
        )

        if store_created:
            self.stdout.write(
                self.style.SUCCESS("Default warehouse created.")
            )

        # =====================================
        # CREATE SUPERUSER
        # =====================================
        user, user_created = User.objects.get_or_create(
            unique_id="1111",
            defaults={
                "is_staff": True,
                "is_superuser": True,
                "role": "admin",
            }
        )

        if user_created:
            user.set_password("admin123")
            user.save()

            self.stdout.write(
                self.style.SUCCESS("Superuser created.")
            )

        else:
            self.stdout.write(
                self.style.WARNING("Superuser already exists.")
            )

        # =====================================
        # ASSIGN STORE
        # =====================================
        user.stores.add(store)

        self.stdout.write(
            self.style.SUCCESS(
                f"{user.unique_id} assigned to {store.name}"
            )
        )