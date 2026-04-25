# apps/sales/management/commands/init_pos_settings.py
from django.core.management.base import BaseCommand
from apps.sales.models import POSSetting

DEFAULT_SETTINGS = {
    "enable_price_change": True,
    "pos_basic_info": {
        "name": "Vision Heritage",
        "address": "26 Main Street, Luanda, Kenya",
        "phone": "+2547 59900 885"
    }
}

class Command(BaseCommand):
    help = "Initialize POS default settings"

    def handle(self, *args, **options):
        for key, value in DEFAULT_SETTINGS.items():
            POSSetting.objects.update_or_create(
                key=key,
                defaults={"value": value, "description": f"Default for {key}"}
            )
        self.stdout.write(self.style.SUCCESS("POS settings initialized"))
