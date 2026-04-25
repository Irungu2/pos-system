# apps/sales/models.py
from django.db import models
from django.contrib.postgres.fields import JSONField  # Django >= 3.1 supports native JSONField

class POSSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)  # store complex settings
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key

    @classmethod
    def get_setting(cls, key, default=None):
        try:
            setting = cls.objects.get(key=key)
            return setting.value
        except cls.DoesNotExist:
            return default
 