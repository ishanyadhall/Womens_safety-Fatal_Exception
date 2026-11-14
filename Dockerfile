FROM python:3.11-slim

WORKDIR /app

# Install dependencies from backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Expose port 5000
EXPOSE 5000

WORKDIR /app/backend

# Start server
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:create_app()"]
