#!/bin/bash

# PenTest Report Generator - Docker Startup Script

set -e

echo "🚀 Starting PenTest Report Generator..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration before proceeding."
    exit 1
fi

# Pull latest images
echo "📦 Pulling latest images..."
docker-compose pull

# Build services
echo "🔨 Building services..."
docker-compose build

# Start database first
echo "🗄️  Starting database..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose run --rm backend prisma migrate deploy

# Start all services
echo "🎉 Starting all services..."
docker-compose up -d

echo "✅ PenTest Report Generator is running!"
echo ""
echo "📍 Access the application at: http://localhost"
echo "📍 API documentation at: http://localhost/api/docs"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
