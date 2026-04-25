#!/bin/bash
set -e

# Default port if not provided
PORT=${PORT:-8000}

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec gunicorn pos.wsgi:application --bind 0.0.0.0:$PORT