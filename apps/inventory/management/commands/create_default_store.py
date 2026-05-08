# apps/inventory/management/commands/create_default_store.py

from django.core.management.base import BaseCommand
from apps.inventory.models import Store


class Command(BaseCommand):
    help = "Create a default warehouse store"

    def handle(self, *args, **kwargs):

        store_name = "Main Warehouse"

        if not Store.objects.filter(name=store_name).exists():

            Store.objects.create(
                name=store_name,
                location="Head Office",
                store_type=Store.WAREHOUSE,
                is_default_warehouse=True,
            )

            self.stdout.write(
                self.style.SUCCESS("Default warehouse store created.")
            )

        else:
            self.stdout.write(
                self.style.WARNING("Default warehouse already exists.")
            )