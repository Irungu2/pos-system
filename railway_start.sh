#!/bin/bash
set -e

# Run migrations
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput

# Start server
exec gunicorn pos.wsgi:application --bind 0.0.0.0:$PORT