from django.contrib.auth.backends import ModelBackend
from .models import User

class UniqueIDAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = User.objects.get(unique_id=username)
        except User.DoesNotExist:
            return None

        if user.check_password(password):
            return user
        return None
