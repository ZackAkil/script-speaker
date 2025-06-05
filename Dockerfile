# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables
ENV PYTHONUNBUFFERED True
ENV APP_HOME /app
WORKDIR $APP_HOME

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the local Flask app to the container
COPY . .

# Expose the port the app runs on (Cloud Run sets this via $PORT)
# Gunicorn will bind to 0.0.0.0:$PORT
ENV PORT 8080

# Command to run the application using Gunicorn
# The number of workers and threads can be adjusted based on expected load
# Timeout 0 means no timeout for requests, useful for potentially long TTS calls
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app