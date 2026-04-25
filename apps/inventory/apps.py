from django.apps import AppConfig


class InventoryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.inventory"
    label = "inventory"        # <-- this is the short app label Django uses internally

    def ready(self):
        import apps.inventory.signals