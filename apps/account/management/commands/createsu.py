from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        User = get_user_model()

        if not User.objects.filter(unique_id="1111").exists():
            User.objects.create_superuser(
                unique_id="1111",
                password="admin123"
            )
            self.stdout.write("Superuser created.")
        else:
            self.stdout.write("Superuser already exists.")

