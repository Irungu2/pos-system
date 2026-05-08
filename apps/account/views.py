from django.shortcuts import render, redirect
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from .models import User
from .forms import LoginForm

# @csrf_protect
# def login_view(request):
#     """Handle user login with session-based authentication."""
#     # If user is already logged in, redirect to dashboard
#     if request.session.get("user_id"):
#         return redirect("dashboard")
 
#     form = LoginForm(request.POST or None)

#     if request.method == "POST" and form.is_valid():
#         unique_id = form.cleaned_data["unique_id"]
#         password = form.cleaned_data["password"]

#         try:
#             user = User.objects.get(unique_id=unique_id)
#         except User.DoesNotExist:
#             messages.error(request, "Invalid Unique ID.")
#             return render(request, "auth/login.html", {"form": form})

#         if user.check_password(password):
#             # Store minimal but essential session data
#             request.session["user_id"] = user.unique_id
#             request.session["username"] = user.username
#             request.session["role"] = user.role
#             request.session.set_expiry(60 * 60 * 4)  # session expires after 4 hours
            
#             messages.success(request, f"Welcome back, {user.first_name}!")
#             return redirect("dashboard")
#         else:
#             messages.error(request, "Incorrect password.")

#     return render(request, "auth/login.html", {"form": form})

# from django.contrib.auth import authenticate, login
# @csrf_protect
# def login_view(request):
#     if request.user.is_authenticated:  # Use Django's authentication check
#         return redirect("dashboard")

#     form = LoginForm(request.POST or None)

#     if request.method == "POST" and form.is_valid():
#         unique_id = form.cleaned_data["unique_id"]
#         password = form.cleaned_data["password"]

#         try:
#             user = User.objects.get(unique_id=unique_id)
#         except User.DoesNotExist:
#             messages.error(request, "Invalid Unique ID.")
#             return render(request, "auth/login.html", {"form": form})

#         if user.check_password(password):
#             # Use Django's login() - this will set request.user
#             login(request, user)
            
#             # No need to store user_id in session separately
#             # Django handles this via the authentication backend
            
#             # But you can still store role in session if needed elsewhere
#             request.session["role"] = user.role
#             request.session.set_expiry(60 * 60 * 4)

#             messages.success(request, f"Welcome back, {user.first_name}!")
#             return redirect("dashboard")
#         else:
#             messages.error(request, "Incorrect password.")

#     return render(request, "auth/login.html", {"form": form})



from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth.decorators import login_required

# @csrf_protect
# def login_view(request):
#     if request.user.is_authenticated:
#         return redirect("dashboard")

#     form = LoginForm(request.POST or None)

#     if request.method == "POST" and form.is_valid():
#         unique_id = form.cleaned_data["unique_id"]
#         password = form.cleaned_data["password"]

#         # ✅ USE AUTHENTICATE (IMPORTANT FIX)
#         user = authenticate(request, unique_id=unique_id, password=password)

#         if user is not None:
#             login(request, user)

#             request.session["role"] = user.role
#             request.session.set_expiry(60 * 60 * 4)

#             messages.success(request, f"Welcome back, {user.first_name}!")
#             return redirect("dashboard")
#         else:
#             messages.error(request, "Invalid credentials.")

#     return render(request, "auth/login.html", {"form": form})    

from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect

@csrf_protect
def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    form = LoginForm(request.POST or None)
    stores = None  # 👈 for modal

    if request.method == "POST" and form.is_valid():
        unique_id = form.cleaned_data["unique_id"]
        password = form.cleaned_data["password"]

        user = authenticate(request, unique_id=unique_id, password=password)

        if user is None:
            messages.error(request, "Invalid credentials.")
            return render(request, "auth/login.html", {
                "form": form,
                "stores": None
            })

        login(request, user)

        # session setup
        request.session["role"] = user.role
        request.session.set_expiry(60 * 60 * 4)

        # 🔥 GET ALL STORES (retail + warehouse)
        user_stores = user.stores.all()

        print("\n[LOGIN DEBUG] User:", user)
        print("[LOGIN DEBUG] Total stores:", user_stores.count())

        for s in user_stores:
            print(f"[STORE] {s.name} | {s.store_type}")

        # ❌ No stores
        if not user_stores.exists():
            messages.error(request, "No store assigned.")
            return redirect("login")

        # ✅ One store → auto login
        if user_stores.count() == 1:
            store = user_stores.first()
            request.session["store_id"] = store.id
            request.session["store_type"] = store.store_type
            return redirect("dashboard")

        # 🔥 Multiple stores → show modal (NOT redirect)
        stores = user_stores

    return render(request, "auth/login.html", {
        "form": form,
        "stores": stores  # 👈 modal will use this
    })


# @login_required
# def set_store(request):
#     if request.method == "POST":
#         store_id = request.POST.get("store_id")

#         store = request.user.stores.filter(id=store_id).first()
#         print('the store id is ', store_id)
#         if not store:
#             return redirect("login")

#         request.session["store_id"] = store.id
#         request.session["store_name"] = store.name

#         return redirect("dashboard")

#     return redirect("login")

# from django.contrib.auth.decorators import login_required
# from django.shortcuts import redirect
# from django.contrib import messages


@login_required
def set_store(request):

    if request.method == "POST":

        store_id = request.POST.get("store_id")

        print("Selected store:", store_id)

        # only allow user's stores
        store = request.user.stores.filter(id=store_id).first()

        if not store:
            messages.error(request, "Invalid store selected.")
            return redirect("dashboard")

        # save session
        request.session["store_id"] = str(store.id)
        request.session["store_name"] = store.name
        request.session["store_type"] = store.store_type

        print("Current store:", store.name)

        messages.success(
            request,
            f"Switched to {store.name}"
        )

        return redirect(request.META.get("HTTP_REFERER", "dashboard"))

    return redirect("dashboard")


from django.contrib.auth import logout

def logout_view(request):
    logout(request)   # <-- This is the correct way
    messages.success(request, "You have been logged out successfully.")
    return redirect("login")
