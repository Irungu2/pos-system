from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth import update_session_auth_hash
from .models import User
from .forms import UserForm


def user_list(request):
    users = User.objects.all().order_by('-date_joined')
    return render(request, "users/user_list.html", {"users": users})


def user_create(request):
    form = UserForm(request.POST or None)

    if request.method == "POST" and form.is_valid():
        user = form.save(commit=False)
        password = form.cleaned_data.get("password")
        if password:
            user.set_password(password)
        else:
            # Set a default password or make it required
            messages.error(request, "Password is required for new users")
            return render(request, "users/user_form.html", {"form": form})
        
        user.save()
        messages.success(request, f"User {user.get_full_name()} created successfully with Unique ID: {user.unique_id}")
        return redirect("user_list")

    return render(request, "users/user_form.html", {"form": form})


def user_update(request, pk):
    user = get_object_or_404(User, pk=pk)
    form = UserForm(request.POST or None, instance=user)

    if request.method == "POST" and form.is_valid():
        user = form.save(commit=False)
        
        password = form.cleaned_data.get("password")
        if password:
            user.set_password(password)
            # Keep the user logged in after password change
            update_session_auth_hash(request, user)
            messages.success(request, "User updated and password changed successfully")
        else:
            messages.success(request, "User updated successfully")
        
        user.save()
        return redirect("user_list")

    return render(request, "users/user_form.html", {"form": form})


def user_delete(request, pk):
    user = get_object_or_404(User, pk=pk)
    
    # Prevent deleting yourself
    if request.user.pk == user.pk:
        messages.error(request, "You cannot delete your own account!")
        return redirect("user_list")

    if request.method == "POST":
        user_name = user.get_full_name()
        user.delete()
        messages.success(request, f"User {user_name} deleted successfully")
        return redirect("user_list")

    return render(request, "users/user_confirm_delete.html", {"user": user})