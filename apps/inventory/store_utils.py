from django.core.exceptions import PermissionDenied

def get_current_store(request):
    """
    Returns the currently selected store for the logged-in user.
    """

    store_id = request.session.get("store_id")

    if not store_id:
        return None

    user = request.user

    store = user.stores.filter(id=store_id).first()

    if not store:
        raise PermissionDenied("Invalid store access")

    return store

