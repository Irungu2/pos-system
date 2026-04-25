from apps.account.models import User
from django.http import HttpResponse


def current_user(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return {"current_user": None}

    try:
        user = User.objects.get(unique_id=user_id)
        return {"current_user": user}
    except User.DoesNotExist:
        return {"current_user": None}

def login_required(view_func):
    """Decorator for session-based login."""
    def wrapper(request, *args, **kwargs):
        user = current_user(request)
        if not user:
            return HttpResponse("Please log in", status=401)

        request.user = user  # Must be a real User instance
        return view_func(request, *args, **kwargs)

    return wrapper


from apps.account.models import User

def get_logged_in_user(request):
    user_id = request.session.get("user_id")
    if not user_id:
        return None
    try:
        return User.objects.get(unique_id=user_id)
    except User.DoesNotExist:
        return None
