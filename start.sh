#!/bin/bash
set -e

echo "START SCRIPT RUNNING ON PORT=$PORT"

PORT=${PORT:-8000}

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# exec gunicorn pos.wsgi:application --bind 0.0.0.0:$PORT
exec gunicorn pos.wsgi:application --bind 0.0.0.0:${PORT:-8080}