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

@csrf_protect
def login_view(request):
    if request.user.is_authenticated:
        return redirect("dashboard")

    form = LoginForm(request.POST or None)

    if request.method == "POST" and form.is_valid():
        unique_id = form.cleaned_data["unique_id"]
        password = form.cleaned_data["password"]

        # ✅ USE AUTHENTICATE (IMPORTANT FIX)
        user = authenticate(request, unique_id=unique_id, password=password)

        if user is not None:
            login(request, user)

            request.session["role"] = user.role
            request.session.set_expiry(60 * 60 * 4)

            messages.success(request, f"Welcome back, {user.first_name}!")
            return redirect("dashboard")
        else:
            messages.error(request, "Invalid credentials.")

    return render(request, "auth/login.html", {"form": form})    



from django.contrib.auth import logout

def logout_view(request):
    logout(request)   # <-- This is the correct way
    messages.success(request, "You have been logged out successfully.")
    return redirect("login")
