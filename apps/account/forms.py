# from django import forms

# class LoginForm(forms.Form):
#     unique_id = forms.CharField(
#         label="Unique ID",
#         max_length=4,
#         widget=forms.TextInput(attrs={
#             "placeholder": "Enter your 4-digit ID",
#             "class": "w-full px-3 py-2 border rounded-md focus:ring focus:ring-blue-300 focus:outline-none"
#         })
#     )
#     password = forms.CharField(
#         label="Password",
#         widget=forms.PasswordInput(attrs={
#             "placeholder": "Enter your password",
#             "class": "w-full px-3 py-2 border rounded-md focus:ring focus:ring-blue-300 focus:outline-none"
#         })
#     )
#     remember_me = forms.BooleanField(
#         required=False,
#         initial=False,
#         label="Remember Me",
#         widget=forms.CheckboxInput(attrs={"class": "mr-2 leading-tight"})
#     )
# from django import forms
# from django.core.validators import RegexValidator

# class LoginForm(forms.Form):
#     unique_id = forms.CharField(
#         label="Unique ID",
#         max_length=4,
#         validators=[
#             RegexValidator(
#                 regex=r'^\d{4}$',
#                 message='Unique ID must be exactly 4 digits',
#                 code='invalid_unique_id'
#             )
#         ],
#         widget=forms.TextInput(attrs={
#             "placeholder": "Enter your 4-digit ID",
#             "class": "appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm",
#             "autocomplete": "username",
#             "autofocus": True
#         })
#     )
    
#     password = forms.CharField(
#         label="Password",
#         widget=forms.PasswordInput(attrs={
#             "placeholder": "Enter your password",
#             "class": "appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm",
#             "autocomplete": "current-password"
#         })
#     )
    
#     remember_me = forms.BooleanField(
#         required=False,
#         initial=False,
#         label="Remember me",
#         widget=forms.CheckboxInput(attrs={
#             "class": "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
#         })
#     )
    
#     def clean_unique_id(self):
#         unique_id = self.cleaned_data.get('unique_id')
#         if unique_id and len(unique_id) != 4:
#             raise forms.ValidationError('Unique ID must be exactly 4 digits')
#         return unique_id
    
#     def clean(self):
#         cleaned_data = super().clean()
#         # Add any additional cross-field validation here
#         return cleaned_data


from django import forms
from django.core.validators import RegexValidator

class LoginForm(forms.Form):
    unique_id = forms.CharField(
        label="Unique ID",
        max_length=4,
        validators=[
            RegexValidator(
                regex=r'^\d{4}$',
                message='Unique ID must be exactly 4 digits',
                code='invalid_unique_id'
            )
        ],
        widget=forms.TextInput(attrs={
            "placeholder": "Enter your 4-digit ID",
            "class": "appearance-none rounded-lg relative block w-full pl-10 pr-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-200",
            "autocomplete": "username",
            "autofocus": True
        })
    )
    
    password = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={
            "placeholder": "Enter your password",
            "class": "appearance-none rounded-lg relative block w-full pl-10 pr-10 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all duration-200",
            "autocomplete": "current-password"
        })
    )
    
    remember_me = forms.BooleanField(
        required=False,
        initial=False,
        label="Remember me",
        widget=forms.CheckboxInput(attrs={
            "class": "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200"
        })
    )



from django import forms
from .models import User

class UserForm(forms.ModelForm):
    password = forms.CharField(
        required=False, 
        widget=forms.PasswordInput(attrs={'class': 'form-control'}),
        help_text="Leave blank to keep current password (for updates)"
    )
    
    class Meta:
        model = User
        fields = ["first_name", "last_name", "role", "password"]
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'First name'}),
            'last_name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Last name'}),
            'role': forms.Select(attrs={'class': 'form-control'}),
        }
        labels = {
            'first_name': 'First Name',
            'last_name': 'Last Name',
            'role': 'Role',
        }