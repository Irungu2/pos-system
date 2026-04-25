from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "unique_id",
            "role",
            "date_joined",  # ✅ correct field
            "full_name",
        ]
        read_only_fields = ["unique_id", "date_joined"]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
